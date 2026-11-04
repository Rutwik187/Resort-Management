import "server-only";
import { and, asc, count, eq, gt, gte, inArray, ne, or, sql } from "drizzle-orm";
import { bookings, getDb, guests, holds } from "@repo/db";
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
