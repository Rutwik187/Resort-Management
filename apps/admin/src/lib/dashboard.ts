import "server-only";
import { and, asc, count, eq, gt, gte, inArray, ne, or, sql } from "drizzle-orm";
import { bookings, getDb, guests, holds, roomTypes, unitNights, units } from "@repo/db";
import { addDays, type BookingStatus } from "@repo/engine";
import { bookedOn } from "./bookings";
import { nightlyStock } from "./stock";

/** Bookings that count as sales: money has come in, whatever happened next. */
const sold: BookingStatus[] = ["part_paid", "confirmed", "checked_in", "checked_out", "no_show"];
const owing: BookingStatus[] = ["part_paid", "confirmed", "checked_in", "checked_out"];

/**
 * A resort's day at a glance (ADM-01): who arrives, leaves and is in, sales
 * today and this month, rooms booked tonight, money still to collect, and
 * room types running low. Plus the two charts (ADM-02): sales for the last
 * 30 days and rooms booked for the next 30 nights.
 */
export async function resortToday(property: { id: string; lowStockThreshold: number }, today: string) {
  const db = getDb();
  const row = {
    id: bookings.id,
    number: bookings.number,
    status: bookings.status,
    checkIn: bookings.checkIn,
    checkOut: bookings.checkOut,
    visitDate: bookings.visitDate,
    totalPaise: bookings.totalPaise,
    paidPaise: bookings.paidPaise,
    guestName: guests.name,
  };
  // A booking still waiting for payment counts only while its hold lasts.
  const live = or(ne(bookings.status, "pending_payment"), gt(holds.expiresAt, sql`now()`));
  const list = (where: ReturnType<typeof and>) =>
    db
      .select(row)
      .from(bookings)
      .innerJoin(guests, eq(guests.id, bookings.guestId))
      .leftJoin(holds, eq(holds.bookingId, bookings.id))
      .where(and(eq(bookings.propertyId, property.id), where, live))
      .orderBy(asc(bookings.number));

  const arrivals = await list(and(or(eq(bookings.checkIn, today), eq(bookings.visitDate, today)), inArray(bookings.status, ["pending_payment", ...owing])));
  const departures = await list(and(eq(bookings.checkOut, today), inArray(bookings.status, owing)));
  const inHouse = await list(eq(bookings.status, "checked_in"));

  const monthStart = `${today.slice(0, 8)}01`;
  const [sales] = await db
    .select({
      todayPaise: sql<number>`coalesce(sum(${bookings.totalPaise}) filter (where ${bookedOn} = ${today}), 0)`.mapWith(Number),
      todayCount: sql<number>`count(*) filter (where ${bookedOn} = ${today})`.mapWith(Number),
      monthPaise: sql<number>`coalesce(sum(${bookings.totalPaise}), 0)`.mapWith(Number),
      monthCount: count(),
    })
    .from(bookings)
    .where(and(eq(bookings.propertyId, property.id), inArray(bookings.status, sold), gte(bookedOn, monthStart)));

  const [collect] = await db
    .select({ paise: sql<number>`coalesce(sum(${bookings.totalPaise} - ${bookings.paidPaise}), 0)`.mapWith(Number), count: count() })
    .from(bookings)
    .leftJoin(holds, eq(holds.bookingId, bookings.id))
    .where(and(eq(bookings.propertyId, property.id), inArray(bookings.status, ["pending_payment", ...owing]), gt(bookings.totalPaise, bookings.paidPaise), live));

  // Sales by the day they were made, for the last 30 days.
  const salesFrom = addDays(today, -29);
  const byDay = await db
    .select({ day: bookedOn, paise: sql<number>`coalesce(sum(${bookings.totalPaise}), 0)`.mapWith(Number), count: count() })
    .from(bookings)
    .where(and(eq(bookings.propertyId, property.id), inArray(bookings.status, sold), gte(bookedOn, salesFrom)))
    .groupBy(bookedOn);
  const salesDays = Array.from({ length: 30 }, (_, i) => {
    const day = addDays(salesFrom, i);
    const found = byDay.find((d) => d.day === day);
    return { day, paise: found?.paise ?? 0, count: found?.count ?? 0 };
  });

  // Rooms booked each night for the next 30 nights, and room types running low in the next 14 (INV-10).
  const stock = await nightlyStock(property.id, today, addDays(today, 29));
  const unitsInUse = stock.types.reduce((sum, t) => sum + t.units, 0);
  const nights = Array.from({ length: 30 }, (_, i) => {
    const night = addDays(today, i);
    const booked = stock.types.reduce((sum, t) => sum + stock.on(t.id, night).booked, 0);
    return { night, booked, units: unitsInUse };
  });
  const low = stock.types
    .filter((t) => t.units > 0)
    .flatMap((t) =>
      nights.slice(0, 14).map(({ night }) => {
        const taken = stock.on(t.id, night);
        return { roomType: t.name, night, units: t.units, free: t.units - taken.booked - taken.held - taken.blocked };
      }),
    )
    // Low means rooms have gone: a type with one room isn't low just because one is free.
    .filter((entry) => entry.free <= property.lowStockThreshold && entry.free < entry.units)
    .sort((a, b) => a.night.localeCompare(b.night) || a.roomType.localeCompare(b.roomType));

  return { arrivals, departures, inHouse, sales, collect, salesDays, nights, unitsInUse, tonight: nights[0], low };
}

export type ResortGlance = {
  arrivals: number;
  departures: number;
  inHouse: number;
  roomTypes: number;
  units: number;
  bookedTonight: number;
  salesMonthPaise: number;
  salesMonthCount: number;
};

/**
 * Each resort's day in a few numbers, for the page of all resorts: arrivals,
 * departures, guests in, rooms booked tonight, and sales this month. The
 * same rules as a resort's Today page, counted for every resort at once.
 */
export async function resortsAtAGlance(propertyIds: string[], today: string): Promise<Map<string, ResortGlance>> {
  const glance = new Map<string, ResortGlance>(
    propertyIds.map((id) => [id, { arrivals: 0, departures: 0, inHouse: 0, roomTypes: 0, units: 0, bookedTonight: 0, salesMonthPaise: 0, salesMonthCount: 0 }]),
  );
  if (propertyIds.length === 0) return glance;
  const db = getDb();
  const live = or(ne(bookings.status, "pending_payment"), gt(holds.expiresAt, sql`now()`));
  const arriving = or(eq(bookings.checkIn, today), eq(bookings.visitDate, today));
  const statusIn = (list: BookingStatus[]) => sql.join(list.map((status) => sql`${status}`), sql`, `);

  const [people, sales, stock, tonight] = await Promise.all([
    db
      .select({
        propertyId: bookings.propertyId,
        arrivals: sql<number>`count(*) filter (where ${arriving} and ${bookings.status} in (${statusIn(["pending_payment", ...owing])}))`.mapWith(Number),
        departures: sql<number>`count(*) filter (where ${bookings.checkOut} = ${today} and ${bookings.status} in (${statusIn(owing)}))`.mapWith(Number),
        inHouse: sql<number>`count(*) filter (where ${bookings.status} = 'checked_in')`.mapWith(Number),
      })
      .from(bookings)
      .leftJoin(holds, eq(holds.bookingId, bookings.id))
      .where(and(inArray(bookings.propertyId, propertyIds), live, or(arriving, eq(bookings.checkOut, today), eq(bookings.status, "checked_in"))))
      .groupBy(bookings.propertyId),
    db
      .select({ propertyId: bookings.propertyId, paise: sql<number>`coalesce(sum(${bookings.totalPaise}), 0)`.mapWith(Number), count: count() })
      .from(bookings)
      .where(and(inArray(bookings.propertyId, propertyIds), inArray(bookings.status, sold), gte(bookedOn, `${today.slice(0, 8)}01`)))
      .groupBy(bookings.propertyId),
    db
      .select({
        propertyId: roomTypes.propertyId,
        types: sql<number>`count(distinct ${roomTypes.id})`.mapWith(Number),
        units: sql<number>`count(${units.id}) filter (where ${units.status} = 'active')`.mapWith(Number),
      })
      .from(roomTypes)
      .leftJoin(units, eq(units.roomTypeId, roomTypes.id))
      .where(and(inArray(roomTypes.propertyId, propertyIds), eq(roomTypes.status, "active")))
      .groupBy(roomTypes.propertyId),
    db
      .select({ propertyId: unitNights.propertyId, booked: count(unitNights.bookingId) })
      .from(unitNights)
      .innerJoin(units, and(eq(units.id, unitNights.unitId), eq(units.status, "active")))
      .innerJoin(roomTypes, and(eq(roomTypes.id, units.roomTypeId), eq(roomTypes.status, "active")))
      .where(and(inArray(unitNights.propertyId, propertyIds), eq(unitNights.night, today)))
      .groupBy(unitNights.propertyId),
  ]);

  for (const row of people) Object.assign(glance.get(row.propertyId)!, { arrivals: row.arrivals, departures: row.departures, inHouse: row.inHouse });
  for (const row of sales) Object.assign(glance.get(row.propertyId)!, { salesMonthPaise: row.paise, salesMonthCount: row.count });
  for (const row of stock) Object.assign(glance.get(row.propertyId)!, { roomTypes: row.types, units: row.units });
  for (const row of tonight) glance.get(row.propertyId)!.bookedTonight = row.booked;
  return glance;
}
