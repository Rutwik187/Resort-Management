import { and, asc, eq, gt, gte, inArray, lt, notExists, sql } from "drizzle-orm";
import { capacityDays, capacityHolds, holds, offerings, offeringSlots, roomTypes, stayRules, unitNights, units, type Executor } from "@repo/db";
import { dayOfWeek, nightsOf } from "./dates";

/*
 * Availability per room type per night: active units, less those booked,
 * held or blocked (INV-01). It is always read live, never cached. A hold
 * past its time counts as free here, before any job clears it.
 */

/** A unit-night counts as taken unless it belongs to a hold that has run out. */
const takenBetween = (db: Executor, from: string, to: string) =>
  db
    .select({ one: sql`1` })
    .from(unitNights)
    .leftJoin(holds, eq(holds.id, unitNights.holdId))
    .where(
      and(
        eq(unitNights.unitId, units.id),
        gte(unitNights.night, from),
        lt(unitNights.night, to),
        sql`not (${unitNights.holdId} is not null and ${holds.expiresAt} <= now())`,
      ),
    );

/** Active units of a room type that are free every night from check-in to check-out, best first. */
export async function freeUnits(db: Executor, roomTypeId: string, checkIn: string, checkOut: string, exclude: readonly string[] = []) {
  const rows = await db
    .select({ id: units.id, name: units.name })
    .from(units)
    .where(and(eq(units.roomTypeId, roomTypeId), eq(units.status, "active"), notExists(takenBetween(db, checkIn, checkOut))))
    .orderBy(asc(units.sortOrder), asc(units.name));
  return rows.filter((unit) => !exclude.includes(unit.id));
}

export type StayOption = {
  roomTypeId: string;
  code: string;
  name: string;
  category: string;
  freeUnits: number;
  /** Why it can't be booked for these dates, when a stay rule says no. */
  closedReason: string | null;
};

/**
 * Every active room type at a resort for a stay, with how many units are
 * free and whether its stay rules allow these dates (INV-08). Sold-out
 * types are listed with zero free, not left out (booking step 2).
 */
export async function searchStays(db: Executor, propertyId: string, checkIn: string, checkOut: string): Promise<StayOption[]> {
  const nights = nightsOf(checkIn, checkOut);
  const types = await db
    .select({ id: roomTypes.id, code: roomTypes.code, name: roomTypes.name, category: roomTypes.category })
    .from(roomTypes)
    .where(and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.status, "active")))
    .orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));
  if (types.length === 0) return [];
  const ids = types.map((t) => t.id);

  // One query after another: inside a transaction they share one connection.
  const counts = await db
    .select({ roomTypeId: units.roomTypeId, free: sql<number>`count(*)::int` })
    .from(units)
    .where(and(inArray(units.roomTypeId, ids), eq(units.status, "active"), notExists(takenBetween(db, checkIn, checkOut))))
    .groupBy(units.roomTypeId);
  const rules = await db
    .select()
    .from(stayRules)
    .where(and(inArray(stayRules.roomTypeId, ids), gte(stayRules.night, checkIn), lt(stayRules.night, checkOut)));

  return types.map((type) => {
    const own = rules.filter((rule) => rule.roomTypeId === type.id);
    return {
      roomTypeId: type.id,
      code: type.code,
      name: type.name,
      category: type.category,
      freeUnits: counts.find((c) => c.roomTypeId === type.id)?.free ?? 0,
      closedReason: stayRuleProblem(own, checkIn, nights.length),
    };
  });
}

type RuleRow = { night: string; stopSell: boolean; closedToArrival: boolean; minNights: number | null; maxNights: number | null };

/** The first stay rule a stay breaks, in words, or null when it is allowed. */
export function stayRuleProblem(rules: readonly RuleRow[], checkIn: string, nightCount: number): string | null {
  const stopped = rules.find((rule) => rule.stopSell);
  if (stopped) return `Not sold for the night of ${stopped.night}.`;
  const arrival = rules.find((rule) => rule.night === checkIn);
  if (arrival?.closedToArrival) return `No arrivals on ${checkIn}.`;
  if (arrival?.minNights && nightCount < arrival.minNights) return `Stays from ${checkIn} need at least ${arrival.minNights} nights.`;
  if (arrival?.maxNights && nightCount > arrival.maxNights) return `Stays from ${checkIn} can be at most ${arrival.maxNights} nights.`;
  return null;
}

export type SeatOption = {
  slotId: string;
  slotLabel: string;
  offeringId: string;
  offeringName: string;
  kind: (typeof offerings.$inferSelect)["kind"];
  adultPaise: number;
  capacity: number;
  sold: number;
  held: number;
  left: number;
  /** True when staff set this day's seats; false when it uses the slot's usual seats. */
  setForDay: boolean;
  /** Why it isn't sold that day: the day of the week, or outside its dates. */
  closedReason: string | null;
};

/**
 * Every active offering slot at a resort for one day, with its seats left
 * (INV-09): the day's capacity, or the slot's usual one, less seats sold and
 * held. Holds that have run out don't count.
 */
export async function seatsLeft(db: Executor, propertyId: string, day: string): Promise<SeatOption[]> {
  const rows = await db
    .select({
      slotId: offeringSlots.id,
      slotLabel: offeringSlots.label,
      defaultCapacity: offeringSlots.defaultCapacity,
      offeringId: offerings.id,
      offeringName: offerings.name,
      kind: offerings.kind,
      adultPaise: offerings.adultPaise,
      soldOn: offerings.soldOn,
      validFrom: offerings.validFrom,
      validTo: offerings.validTo,
      capacity: capacityDays.capacity,
      sold: capacityDays.sold,
    })
    .from(offeringSlots)
    .innerJoin(offerings, eq(offerings.id, offeringSlots.offeringId))
    .leftJoin(capacityDays, and(eq(capacityDays.slotId, offeringSlots.id), eq(capacityDays.day, day)))
    .where(and(eq(offeringSlots.propertyId, propertyId), eq(offerings.active, true), eq(offeringSlots.active, true)))
    .orderBy(asc(offerings.sortOrder), asc(offerings.name), asc(offeringSlots.sortOrder));
  if (rows.length === 0) return [];

  const live = await db
    .select({ slotId: capacityHolds.slotId, guests: sql<number>`sum(${capacityHolds.guests})::int` })
    .from(capacityHolds)
    .innerJoin(holds, eq(holds.id, capacityHolds.holdId))
    .where(and(eq(capacityHolds.day, day), eq(holds.status, "active"), gt(holds.expiresAt, sql`now()`), inArray(capacityHolds.slotId, rows.map((r) => r.slotId))))
    .groupBy(capacityHolds.slotId);

  const weekday = dayOfWeek(day);
  return rows.map((row) => {
    const capacity = row.capacity ?? row.defaultCapacity;
    const sold = row.sold ?? 0;
    const held = live.find((l) => l.slotId === row.slotId)?.guests ?? 0;
    const closedReason =
      row.soldOn?.length && !row.soldOn.includes(weekday)
        ? "Not sold on this day of the week."
        : (row.validFrom && day < row.validFrom) || (row.validTo && day > row.validTo)
          ? "Not sold on this date."
          : null;
    return {
      slotId: row.slotId,
      slotLabel: row.slotLabel,
      offeringId: row.offeringId,
      offeringName: row.offeringName,
      kind: row.kind,
      adultPaise: row.adultPaise,
      capacity,
      sold,
      held,
      left: Math.max(0, capacity - sold - held),
      setForDay: row.capacity !== null,
      closedReason,
    };
  });
}
