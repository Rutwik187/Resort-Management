import "server-only";
import { and, asc, count, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { bookingItems, bookings, getDb, guests, leads, offerings, offlinePayments, roomTypes, unitNights, units } from "@repo/db";
import type { BookingStatus } from "@repo/engine";
import { bookedOn } from "./bookings";

/*
 * The admin's reports (docs/implementation-plan.md, section 9: Reports),
 * for one resort and one period, both days included, in India time. Sales
 * count bookings by the day they were made; occupancy counts the nights
 * stayed; payments count the day the money came in.
 */

/** Bookings that count as sales: money has come in, whatever happened next. */
const sold: BookingStatus[] = ["part_paid", "confirmed", "checked_in", "checked_out", "no_show"];
const receivedOn = sql<string>`(${offlinePayments.receivedAt} at time zone 'Asia/Kolkata')::date`;
const leadOn = sql<string>`(${leads.createdAt} at time zone 'Asia/Kolkata')::date`;

export type Period = { from: string; to: string };

export async function salesReport(propertyId: string, { from, to }: Period) {
  const db = getDb();
  const inPeriod = and(eq(bookings.propertyId, propertyId), gte(bookedOn, from), lte(bookedOn, to));
  const isStay = sql<boolean>`${bookings.checkIn} is not null`;
  const isSold = inArray(bookings.status, sold);
  const [totals] = await db
    .select({
      count: sql<number>`count(*) filter (where ${isSold})`.mapWith(Number),
      paise: sql<number>`coalesce(sum(${bookings.totalPaise}) filter (where ${isSold}), 0)`.mapWith(Number),
      stays: sql<number>`count(*) filter (where ${isSold} and ${isStay})`.mapWith(Number),
      stayPaise: sql<number>`coalesce(sum(${bookings.totalPaise}) filter (where ${isSold} and ${isStay}), 0)`.mapWith(Number),
      cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')`.mapWith(Number),
      cancelledPaise: sql<number>`coalesce(sum(${bookings.totalPaise}) filter (where ${bookings.status} = 'cancelled'), 0)`.mapWith(Number),
      waiting: sql<number>`count(*) filter (where ${bookings.status} = 'pending_payment')`.mapWith(Number),
    })
    .from(bookings)
    .where(inPeriod);
  const bySource = await db
    .select({ source: bookings.source, count: count(), paise: sql<number>`coalesce(sum(${bookings.totalPaise}), 0)`.mapWith(Number) })
    .from(bookings)
    .where(and(inPeriod, inArray(bookings.status, sold)))
    .groupBy(bookings.source)
    .orderBy(sql`3 desc`);
  const byDay = await db
    .select({ day: bookedOn, count: count(), paise: sql<number>`coalesce(sum(${bookings.totalPaise}), 0)`.mapWith(Number) })
    .from(bookings)
    .where(and(inPeriod, inArray(bookings.status, sold)))
    .groupBy(bookedOn);
  return {
    count: totals.count,
    paise: totals.paise,
    stays: { count: totals.stays, paise: totals.stayPaise },
    days: { count: totals.count - totals.stays, paise: totals.paise - totals.stayPaise },
    cancelled: { count: totals.cancelled, paise: totals.cancelledPaise },
    waiting: totals.waiting,
    bySource,
    byDay: new Map(byDay.map((d) => [d.day, d])),
  };
}

/** Money taken at the resort and by bank transfer, by the day it came in. */
export async function paymentsReport(propertyId: string, { from, to }: Period) {
  const rows = await getDb()
    .select({ method: offlinePayments.method, count: count(), paise: sql<number>`coalesce(sum(${offlinePayments.amountPaise}), 0)`.mapWith(Number) })
    .from(offlinePayments)
    .where(and(eq(offlinePayments.propertyId, propertyId), gte(receivedOn, from), lte(receivedOn, to)))
    .groupBy(offlinePayments.method)
    .orderBy(sql`3 desc`);
  return { byMethod: rows, paise: rows.reduce((sum, r) => sum + r.paise, 0), count: rows.reduce((sum, r) => sum + r.count, 0) };
}

/**
 * Each room type's nights: how many were for sale (rooms in use × nights in
 * the period), how many were booked, and what they earned at the price
 * booked, each stay's price shared evenly over its nights.
 */
export async function occupancyReport(propertyId: string, { from, to }: Period) {
  const db = getDb();
  const nights = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  const types = await db
    .select({ id: roomTypes.id, name: roomTypes.name, units: sql<number>`count(${units.id}) filter (where ${units.status} = 'active')`.mapWith(Number) })
    .from(roomTypes)
    .leftJoin(units, eq(units.roomTypeId, roomTypes.id))
    .where(and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.status, "active")))
    .groupBy(roomTypes.id)
    .orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));
  const booked = await db
    .select({ roomTypeId: units.roomTypeId, nights: count() })
    .from(unitNights)
    .innerJoin(units, eq(units.id, unitNights.unitId))
    .where(and(eq(unitNights.propertyId, propertyId), isNotNull(unitNights.bookingId), gte(unitNights.night, from), lte(unitNights.night, to)))
    .groupBy(units.roomTypeId);
  // Each stay's price over its nights, counting only the nights in the period.
  const overlap = sql<number>`(least(${bookings.checkOut}, ${to}::date + 1) - greatest(${bookings.checkIn}, ${from}::date))`;
  const earned = await db
    .select({
      roomTypeId: bookingItems.roomTypeId,
      paise: sql<number>`coalesce(sum(${bookingItems.amountPaise}::numeric * ${overlap} / (${bookings.checkOut} - ${bookings.checkIn})), 0)`.mapWith(Number),
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .where(
      and(
        eq(bookingItems.propertyId, propertyId),
        eq(bookingItems.kind, "stay"),
        inArray(bookings.status, sold),
        lte(bookings.checkIn, to),
        sql`${bookings.checkOut} > ${from}::date`,
        isNotNull(bookingItems.amountPaise),
      ),
    )
    .groupBy(bookingItems.roomTypeId);
  const rows = types.map((type) => {
    const sold = booked.find((b) => b.roomTypeId === type.id)?.nights ?? 0;
    const paise = Math.round(earned.find((e) => e.roomTypeId === type.id)?.paise ?? 0);
    return { id: type.id, name: type.name, units: type.units, available: type.units * nights, sold, paise };
  });
  const available = rows.reduce((sum, r) => sum + r.available, 0);
  const soldNights = rows.reduce((sum, r) => sum + r.sold, 0);
  const paise = rows.reduce((sum, r) => sum + r.paise, 0);
  return { nights, rows, available, sold: soldNights, paise };
}

/** Leads that came in the period: where they stand now, what they wanted, and how they came. */
export async function leadsReport(propertyId: string, { from, to }: Period) {
  const db = getDb();
  const where = and(eq(leads.propertyId, propertyId), gte(leadOn, from), lte(leadOn, to));
  const [byStatus, byInterest, bySource] = await Promise.all([
    db.select({ key: leads.status, count: count() }).from(leads).where(where).groupBy(leads.status),
    db.select({ key: leads.interest, count: count() }).from(leads).where(where).groupBy(leads.interest).orderBy(sql`2 desc`),
    db.select({ key: leads.source, count: count() }).from(leads).where(where).groupBy(leads.source).orderBy(sql`2 desc`),
  ]);
  const total = byStatus.reduce((sum, r) => sum + r.count, 0);
  const won = byStatus.find((r) => r.key === "won")?.count ?? 0;
  const lost = byStatus.find((r) => r.key === "lost")?.count ?? 0;
  return { total, won, lost, open: total - won - lost, byStatus, byInterest, bySource };
}

/** Guests on day packages, activities and sittings in the period, by the day of the visit. */
export async function daysReport(propertyId: string, { from, to }: Period) {
  const rows = await getDb()
    .select({ offering: offerings.name, party: bookingItems.party, paise: bookingItems.amountPaise })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .innerJoin(offerings, eq(offerings.id, bookingItems.offeringId))
    .where(and(eq(bookingItems.propertyId, propertyId), eq(bookingItems.kind, "offering"), inArray(bookings.status, sold), gte(bookings.visitDate, from), lte(bookings.visitDate, to)));
  const by = new Map<string, { offering: string; guests: number; paise: number }>();
  for (const row of rows) {
    const entry = by.get(row.offering) ?? { offering: row.offering, guests: 0, paise: 0 };
    entry.guests += row.party.adults + Object.values(row.party.children ?? {}).reduce((a, b) => a + (b ?? 0), 0);
    entry.paise += row.paise ?? 0;
    by.set(row.offering, entry);
  }
  return [...by.values()].sort((a, b) => b.guests - a.guests);
}

/** Every booking made in the period, for the CSV download. */
export async function bookingsForExport(propertyId: string, { from, to }: Period) {
  return getDb()
    .select({
      number: bookings.number,
      bookedOn,
      source: bookings.source,
      status: bookings.status,
      guest: guests.name,
      phone: guests.phone,
      email: guests.email,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      visitDate: bookings.visitDate,
      totalPaise: bookings.totalPaise,
      paidPaise: bookings.paidPaise,
    })
    .from(bookings)
    .innerJoin(guests, eq(guests.id, bookings.guestId))
    .where(and(eq(bookings.propertyId, propertyId), gte(bookedOn, from), lte(bookedOn, to)))
    .orderBy(asc(bookings.createdAt));
}
