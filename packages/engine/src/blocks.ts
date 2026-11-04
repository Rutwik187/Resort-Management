import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { blocks, holds, inventoryLog, unitNights, units, type Database } from "@repo/db";
import { addDays, isDate, nightsOf } from "./dates";
import { NotFoundError, RuleError } from "./errors";

export type BlockReason = (typeof blocks.$inferSelect)["reason"];

/**
 * Blocks a unit, a whole room type, or (with neither) the whole resort, for
 * a range of nights (INV-04, INV-05). A block can't take a night that is
 * already held or booked: the error says how many clash, and nothing is
 * blocked.
 */
export async function createBlock(
  db: Database,
  input: { propertyId: string; roomTypeId?: string; unitId?: string; startsOn: string; endsOn: string; reason: BlockReason; note?: string; userId?: string },
) {
  if (!isDate(input.startsOn) || !isDate(input.endsOn) || input.endsOn < input.startsOn) throw new RuleError("The last night must be on or after the first.");
  const nights = nightsOf(input.startsOn, addDays(input.endsOn, 1));

  return db.transaction(async (tx) => {
    const targets = await tx
      .select({ id: units.id })
      .from(units)
      .where(
        and(
          eq(units.propertyId, input.propertyId),
          input.unitId ? eq(units.id, input.unitId) : undefined,
          input.roomTypeId ? eq(units.roomTypeId, input.roomTypeId) : undefined,
        ),
      );
    if (targets.length === 0) throw new NotFoundError("Unit");
    const unitIds = targets.map((t) => t.id);

    // Holds that have run out don't count; clear them first.
    await tx.execute(sql`
      delete from ${unitNights} using ${holds}
      where ${unitNights.holdId} = ${holds.id} and ${holds.expiresAt} <= now()
        and ${inArray(unitNights.unitId, unitIds)}
        and ${unitNights.night} >= ${input.startsOn} and ${unitNights.night} <= ${input.endsOn}`);

    const [block] = await tx
      .insert(blocks)
      .values({ ...input, roomTypeId: input.roomTypeId ?? null, unitId: input.unitId ?? null, note: input.note ?? null, createdBy: input.userId ?? null })
      .returning({ id: blocks.id });
    const inserted = await tx
      .insert(unitNights)
      .values(unitIds.flatMap((unitId) => nights.map((night) => ({ propertyId: input.propertyId, unitId, night, blockId: block.id }))))
      .onConflictDoNothing()
      .returning({ unitId: unitNights.unitId });
    const clashes = unitIds.length * nights.length - inserted.length;
    if (clashes > 0) throw new RuleError(`${clashes} of these room nights are already held, booked or blocked. Nothing was blocked.`);

    await tx.insert(inventoryLog).values(
      unitIds.map((unitId) => ({ propertyId: input.propertyId, action: "block" as const, unitId, fromDate: input.startsOn, toDate: input.endsOn, blockId: block.id, userId: input.userId ?? null, reason: input.reason })),
    );
    return { blockId: block.id, unitNights: inserted.length };
  });
}

/** Lifts a block: its nights free up, and the block stays on record. */
export async function liftBlock(db: Database, input: { blockId: string; userId?: string }) {
  await db.transaction(async (tx) => {
    const [block] = await tx.select().from(blocks).where(and(eq(blocks.id, input.blockId), isNull(blocks.liftedAt))).for("update");
    if (!block) throw new NotFoundError("Block");
    const freed = await tx.delete(unitNights).where(eq(unitNights.blockId, block.id)).returning({ unitId: unitNights.unitId });
    await tx.update(blocks).set({ liftedAt: new Date() }).where(eq(blocks.id, block.id));
    for (const unitId of new Set(freed.map((f) => f.unitId))) {
      await tx.insert(inventoryLog).values({ propertyId: block.propertyId, action: "unblock", unitId, fromDate: block.startsOn, toDate: block.endsOn, blockId: block.id, userId: input.userId ?? null });
    }
  });
}
