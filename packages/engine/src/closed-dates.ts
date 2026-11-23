import { and, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { capacityDays, capacityHolds, holds, offerings, offeringSlots, properties, roomTypes, stayRules, unitNights, units, type Executor } from "@repo/db";
import { NotFoundError } from "./errors";
import { addDays, dayOfWeek, isDate } from "./dates";

/*
 * The dates a website's calendar greys out (BW-04). A night is closed for
 * stays when no room on the website is free that night: every active unit
 * is booked, held or blocked, or its room type stops selling that night. A
 * day is closed for day visits when no package can sell a seat that day.
 * Room types with no rooms entered, and slots with no seats set, are
 * unknown, so they never close a date. Read live, never cached.
 */

const mostDays = 550;

export async function closedDates(db: Executor, input: { propertyCode: string; kind: "stay" | "day"; from: string; to: string }): Promise<string[]> {
  if (!isDate(input.from) || !isDate(input.to) || input.to < input.from) return [];
  const to = input.to > addDays(input.from, mostDays) ? addDays(input.from, mostDays) : input.to;
  const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.code, input.propertyCode));
  if (!property) throw new NotFoundError("Resort");
  return input.kind === "stay" ? closedNights(db, property.id, input.from, to) : closedDays(db, property.id, input.from, to);
}

async function closedNights(db: Executor, propertyId: string, from: string, to: string): Promise<string[]> {
  const rooms = await db
    .select({ id: units.id, roomTypeId: units.roomTypeId })
    .from(units)
    .innerJoin(roomTypes, eq(roomTypes.id, units.roomTypeId))
    .where(and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.status, "active"), eq(roomTypes.onWebsite, true), eq(units.status, "active")));
  if (rooms.length === 0) return [];
  const unitIds = rooms.map((r) => r.id);

  // Taken unit-nights: a hold that has run out doesn't count.
  const taken = await db
    .select({ unitId: unitNights.unitId, night: unitNights.night })
    .from(unitNights)
    .leftJoin(holds, eq(holds.id, unitNights.holdId))
    .where(and(inArray(unitNights.unitId, unitIds), gte(unitNights.night, from), lte(unitNights.night, to), sql`not (${unitNights.holdId} is not null and ${holds.expiresAt} <= now())`));
  const stopped = await db
    .select({ roomTypeId: stayRules.roomTypeId, night: stayRules.night })
    .from(stayRules)
    .where(and(inArray(stayRules.roomTypeId, [...new Set(rooms.map((r) => r.roomTypeId))]), gte(stayRules.night, from), lte(stayRules.night, to), eq(stayRules.stopSell, true)));

  const takenSet = new Set(taken.map((t) => `${t.unitId}|${t.night}`));
  const stoppedSet = new Set(stopped.map((s) => `${s.roomTypeId}|${s.night}`));
  const closed: string[] = [];
  for (let night = from; night <= to; night = addDays(night, 1)) {
    const free = rooms.some((room) => !takenSet.has(`${room.id}|${night}`) && !stoppedSet.has(`${room.roomTypeId}|${night}`));
    if (!free) closed.push(night);
  }
  return closed;
}

async function closedDays(db: Executor, propertyId: string, from: string, to: string): Promise<string[]> {
  const slots = await db
    .select({
      slotId: offeringSlots.id,
      offeringId: offerings.id,
      defaultCapacity: offeringSlots.defaultCapacity,
      soldOn: offerings.soldOn,
      validFrom: offerings.validFrom,
      validTo: offerings.validTo,
    })
    .from(offeringSlots)
    .innerJoin(offerings, eq(offerings.id, offeringSlots.offeringId))
    .where(and(eq(offeringSlots.propertyId, propertyId), eq(offerings.active, true), eq(offeringSlots.active, true)));
  if (slots.length === 0) return [];
  const slotIds = slots.map((s) => s.slotId);
  const days = await db
    .select({ slotId: capacityDays.slotId, day: capacityDays.day, capacity: capacityDays.capacity, sold: capacityDays.sold })
    .from(capacityDays)
    .where(and(inArray(capacityDays.slotId, slotIds), gte(capacityDays.day, from), lte(capacityDays.day, to)));
  const held = await db
    .select({ slotId: capacityHolds.slotId, day: capacityHolds.day, guests: sql<number>`sum(${capacityHolds.guests})::int` })
    .from(capacityHolds)
    .innerJoin(holds, eq(holds.id, capacityHolds.holdId))
    .where(and(inArray(capacityHolds.slotId, slotIds), gte(capacityHolds.day, from), lte(capacityHolds.day, to), eq(holds.status, "active"), gt(holds.expiresAt, sql`now()`)))
    .groupBy(capacityHolds.slotId, capacityHolds.day);

  const dayRows = new Map(days.map((d) => [`${d.slotId}|${d.day}`, d]));
  const heldRows = new Map(held.map((h) => [`${h.slotId}|${h.day}`, h.guests]));
  const closed: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const weekday = dayOfWeek(day);
    const open = slots.some((slot) => {
      if (slot.soldOn?.length && !slot.soldOn.includes(weekday)) return false;
      if ((slot.validFrom && day < slot.validFrom) || (slot.validTo && day > slot.validTo)) return false;
      const row = dayRows.get(`${slot.slotId}|${day}`);
      // No seats set for the day or as the slot's usual: unknown, so open.
      if (!row && slot.defaultCapacity === 0) return true;
      const capacity = row?.capacity ?? slot.defaultCapacity;
      return capacity - (row?.sold ?? 0) - (heldRows.get(`${slot.slotId}|${day}`) ?? 0) > 0;
    });
    if (!open) closed.push(day);
  }
  return closed;
}
