import "server-only";
import { and, eq, gt, gte, lte, sql } from "drizzle-orm";
import { capacityDays, capacityHolds, getDb, holds } from "@repo/db";
import { addDays } from "@repo/engine";

/**
 * Seats for every slot at a resort over a run of days (INV-09): each day's
 * own number, or the slot's usual one, less seats sold and held. Holds that
 * have run out don't count.
 */
export async function seatsAhead(propertyId: string, from: string, days: number) {
  const db = getDb();
  const to = addDays(from, days - 1);
  const rows = await db
    .select({ slotId: capacityDays.slotId, day: capacityDays.day, capacity: capacityDays.capacity, sold: capacityDays.sold })
    .from(capacityDays)
    .where(and(eq(capacityDays.propertyId, propertyId), gte(capacityDays.day, from), lte(capacityDays.day, to)));
  const live = await db
    .select({ slotId: capacityHolds.slotId, day: capacityHolds.day, guests: sql<number>`sum(${capacityHolds.guests})::int` })
    .from(capacityHolds)
    .innerJoin(holds, eq(holds.id, capacityHolds.holdId))
    .where(and(eq(holds.propertyId, propertyId), eq(holds.status, "active"), gt(holds.expiresAt, sql`now()`), gte(capacityHolds.day, from), lte(capacityHolds.day, to)))
    .groupBy(capacityHolds.slotId, capacityHolds.day);

  return {
    days: Array.from({ length: days }, (_, i) => addDays(from, i)),
    /** A slot's seats on a day. `own` says the day has its own number rather than the usual one. */
    on(slotId: string, usual: number, day: string) {
      const row = rows.find((r) => r.slotId === slotId && r.day === day);
      const held = live.find((l) => l.slotId === slotId && l.day === day)?.guests ?? 0;
      const capacity = row?.capacity ?? usual;
      const sold = row?.sold ?? 0;
      return { capacity, sold, held, left: Math.max(0, capacity - sold - held), own: Boolean(row) };
    },
  };
}
