import "server-only";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { blocks, bookings, getDb, guests, holds, roomTypes, stayRules, unitNights, units } from "@repo/db";
import { addDays, loadRoomPricing, priceNight, type BookingStatus } from "@repo/engine";

export type Cell =
  | { kind: "booked"; bookingId: string; number: string; status: BookingStatus; guest: string }
  | { kind: "held"; until: Date }
  | { kind: "blocked"; blockId: string; reason: string; note: string | null };

/**
 * The inventory calendar for a run of nights (INV-06): room types on sale,
 * their units, what holds each unit on each night, each type's stay rules
 * (INV-08), and its price for the base number of guests (PR-04). Holds that
 * have run out count as free.
 */
export async function loadCalendar(propertyId: string, from: string, days: number) {
  const db = getDb();
  const to = addDays(from, days - 1);
  const nights = Array.from({ length: days }, (_, i) => addDays(from, i));

  const types = await db
    .select({ id: roomTypes.id, name: roomTypes.name, baseOccupancy: roomTypes.baseOccupancy })
    .from(roomTypes)
    .where(and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.status, "active")))
    .orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));
  const typeIds = types.map((t) => t.id);
  if (typeIds.length === 0) return { nights, types: [], units: [], cell: () => undefined, rule: () => undefined, price: () => undefined };

  const unitRows = await db
    .select({ id: units.id, name: units.name, roomTypeId: units.roomTypeId, status: units.status })
    .from(units)
    .where(inArray(units.roomTypeId, typeIds))
    .orderBy(asc(units.sortOrder), asc(units.name));

  const taken = await db
    .select({
      unitId: unitNights.unitId,
      night: unitNights.night,
      bookingId: unitNights.bookingId,
      blockId: unitNights.blockId,
      holdExpiresAt: holds.expiresAt,
      number: bookings.number,
      status: bookings.status,
      guest: guests.name,
      reason: blocks.reason,
      note: blocks.note,
    })
    .from(unitNights)
    .leftJoin(holds, eq(holds.id, unitNights.holdId))
    .leftJoin(bookings, eq(bookings.id, unitNights.bookingId))
    .leftJoin(guests, eq(guests.id, bookings.guestId))
    .leftJoin(blocks, eq(blocks.id, unitNights.blockId))
    .where(and(eq(unitNights.propertyId, propertyId), gte(unitNights.night, from), lte(unitNights.night, to)));
  const cells = new Map<string, Cell>();
  for (const row of taken) {
    const key = `${row.unitId}|${row.night}`;
    if (row.bookingId && row.number && row.status) cells.set(key, { kind: "booked", bookingId: row.bookingId, number: row.number, status: row.status, guest: row.guest ?? "" });
    else if (row.blockId && row.reason) cells.set(key, { kind: "blocked", blockId: row.blockId, reason: row.reason, note: row.note });
    else if (row.holdExpiresAt && row.holdExpiresAt > new Date()) cells.set(key, { kind: "held", until: row.holdExpiresAt });
  }

  const ruleRows = await db
    .select()
    .from(stayRules)
    .where(and(inArray(stayRules.roomTypeId, typeIds), gte(stayRules.night, from), lte(stayRules.night, to)));
  const rules = new Map(ruleRows.map((r) => [`${r.roomTypeId}|${r.night}`, r]));

  const pricing = await loadRoomPricing(db, propertyId, typeIds, { from, to: addDays(to, 1) });
  const prices = new Map<string, { paise: number | null; source: string }>();
  for (const type of types) {
    const priced = pricing.get(type.id);
    if (!priced) continue;
    for (const night of nights) {
      const { paise, source } = priceNight(priced.pricing, night, { adults: type.baseOccupancy, children: {} });
      prices.set(`${type.id}|${night}`, { paise, source });
    }
  }

  return {
    nights,
    types,
    units: unitRows,
    cell: (unitId: string, night: string) => cells.get(`${unitId}|${night}`),
    rule: (roomTypeId: string, night: string) => rules.get(`${roomTypeId}|${night}`),
    price: (roomTypeId: string, night: string) => prices.get(`${roomTypeId}|${night}`),
  };
}
