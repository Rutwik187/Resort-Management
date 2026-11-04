import { eq, sql } from "drizzle-orm";
import { capacityDays, inventoryLog, offeringSlots, type Database } from "@repo/db";
import { isDate } from "./dates";
import { NotFoundError, RuleError } from "./errors";
import { releaseExpiredSeats } from "./holds";

/**
 * Sets how many guests a slot takes on chosen days (INV-09), such as 120
 * for the morning picnic on a festival weekend. A day that already has more
 * guests sold or held than the new number keeps its old number, and is
 * listed in `kept`, so a day can never be oversold. Seats of holds that
 * have run out go back first, so they don't count.
 */
export async function setDayCapacity(db: Database, input: { slotId: string; days: string[]; capacity: number; userId?: string }) {
  if (!Number.isInteger(input.capacity) || input.capacity < 0) throw new RuleError("Seats can't be below zero.");
  if (input.days.length === 0 || !input.days.every(isDate)) throw new RuleError("Choose the days.");
  const days = [...new Set(input.days)].sort();

  return db.transaction(async (tx) => {
    const [slot] = await tx.select({ id: offeringSlots.id, propertyId: offeringSlots.propertyId, offeringId: offeringSlots.offeringId }).from(offeringSlots).where(eq(offeringSlots.id, input.slotId));
    if (!slot) throw new NotFoundError("Slot");
    for (const day of days) await releaseExpiredSeats(tx, slot.id, day);

    const changed = await tx
      .insert(capacityDays)
      .values(days.map((day) => ({ propertyId: slot.propertyId, offeringId: slot.offeringId, slotId: slot.id, day, capacity: input.capacity })))
      .onConflictDoUpdate({
        target: [capacityDays.slotId, capacityDays.day],
        set: { capacity: sql`excluded.capacity` },
        setWhere: sql`${capacityDays.sold} + ${capacityDays.held} <= excluded.capacity`,
      })
      .returning({ day: capacityDays.day });
    const kept = days.filter((day) => !changed.some((row) => row.day === day));

    if (changed.length) {
      await tx.insert(inventoryLog).values({
        propertyId: slot.propertyId,
        action: "capacity",
        slotId: slot.id,
        fromDate: changed[0].day,
        toDate: changed[changed.length - 1].day,
        userId: input.userId ?? null,
        data: { capacity: input.capacity, days: changed.length },
      });
    }
    return { changed: changed.length, kept };
  });
}
