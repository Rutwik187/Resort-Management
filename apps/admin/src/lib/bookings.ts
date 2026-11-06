import "server-only";
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import {
  ageBands,
  bookingEvents,
  bookingItems,
  bookings,
  getDb,
  guests,
  holds,
  offerings,
  offeringSlots,
  offlinePayments,
  properties,
  roomTypes,
  units,
  user,
} from "@repo/db";
import type { BookingSource, BookingStatus } from "@repo/engine";

export const pageSize = 50;

export type BookingFilters = {
  q?: string;
  status?: BookingStatus;
  source?: BookingSource;
  paid?: "unpaid" | "part" | "full";
  arrivingFrom?: string;
  arrivingTo?: string;
  bookedFrom?: string;
  bookedTo?: string;
  page?: number;
};

/** The day the guest comes: check-in for a stay, the visit date for a day booking. */
export const arrival = sql<string>`coalesce(${bookings.checkIn}, ${bookings.visitDate})`;
/** The day the booking was made, in India time. */
export const bookedOn = sql<string>`(${bookings.createdAt} at time zone 'Asia/Kolkata')::date`;

const likeText = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Matches a booking number, a guest's name or email, or their phone number by its digits. */
export function searchMatch(q: string): SQL | undefined {
  const text = q.trim();
  if (!text) return undefined;
  const digits = text.replace(/\D/g, "");
  return or(
    ilike(bookings.number, likeText(text)),
    ilike(guests.name, likeText(text)),
    ilike(guests.email, likeText(text)),
    digits.length >= 4 ? ilike(guests.phone, likeText(digits)) : undefined,
  );
}

const paidMatch = (paid: BookingFilters["paid"]) =>
  paid === "unpaid"
    ? eq(bookings.paidPaise, 0)
    : paid === "part"
      ? and(gt(bookings.paidPaise, 0), or(isNull(bookings.totalPaise), lt(bookings.paidPaise, bookings.totalPaise)))
      : paid === "full"
        ? and(isNotNull(bookings.totalPaise), gte(bookings.paidPaise, bookings.totalPaise))
        : undefined;

/**
 * Bookings at the given resorts, filtered and searched (ADM-03): newest
 * first, or by arrival when an arrival date is set. One page at a time.
 */
export async function findBookings(propertyIds: string[], filters: BookingFilters) {
  if (propertyIds.length === 0) return { rows: [], total: 0 };
  const db = getDb();
  const where = and(
    inArray(bookings.propertyId, propertyIds),
    filters.status ? eq(bookings.status, filters.status) : undefined,
    filters.source ? eq(bookings.source, filters.source) : undefined,
    paidMatch(filters.paid),
    filters.arrivingFrom ? gte(arrival, filters.arrivingFrom) : undefined,
    filters.arrivingTo ? lte(arrival, filters.arrivingTo) : undefined,
    filters.bookedFrom ? gte(bookedOn, filters.bookedFrom) : undefined,
    filters.bookedTo ? lte(bookedOn, filters.bookedTo) : undefined,
    filters.q ? searchMatch(filters.q) : undefined,
  );
  const byArrival = Boolean(filters.arrivingFrom || filters.arrivingTo);
  const page = Math.max(1, filters.page ?? 1);

  const rows = await db
    .select({
      id: bookings.id,
      number: bookings.number,
      status: bookings.status,
      source: bookings.source,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      visitDate: bookings.visitDate,
      totalPaise: bookings.totalPaise,
      paidPaise: bookings.paidPaise,
      createdAt: bookings.createdAt,
      guestName: guests.name,
      guestPhone: guests.phone,
      propertyCode: properties.code,
    })
    .from(bookings)
    .innerJoin(guests, eq(guests.id, bookings.guestId))
    .innerJoin(properties, eq(properties.id, bookings.propertyId))
    .where(where)
    .orderBy(...(byArrival ? [asc(arrival), asc(bookings.number)] : [desc(bookings.createdAt)]))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [{ total }] = await db.select({ total: count() }).from(bookings).innerJoin(guests, eq(guests.id, bookings.guestId)).where(where);

  const summaries = await itemSummaries(rows.map((row) => row.id));
  return { rows: rows.map((row) => ({ ...row, items: summaries.get(row.id) ?? "" })), total };
}

/** How many bookings each quick list on the Bookings page holds: all, arriving today, in the resort, and waiting for payment. */
export async function quickCounts(propertyId: string, today: string) {
  const [row] = await getDb()
    .select({
      all: count(),
      arriving: sql<number>`count(*) filter (where ${arrival} = ${today})`.mapWith(Number),
      inHouse: sql<number>`count(*) filter (where ${bookings.status} = 'checked_in')`.mapWith(Number),
      waiting: sql<number>`count(*) filter (where ${bookings.status} = 'pending_payment')`.mapWith(Number),
    })
    .from(bookings)
    .where(eq(bookings.propertyId, propertyId));
  return row;
}

/** Each booking's rooms or tickets in a few words, such as "Chira Cottage × 2". */
async function itemSummaries(bookingIds: string[]) {
  const result = new Map<string, string>();
  if (bookingIds.length === 0) return result;
  const items = await getDb()
    .select({ bookingId: bookingItems.bookingId, roomType: roomTypes.name, offering: offerings.name })
    .from(bookingItems)
    .leftJoin(roomTypes, eq(roomTypes.id, bookingItems.roomTypeId))
    .leftJoin(offerings, eq(offerings.id, bookingItems.offeringId))
    .where(inArray(bookingItems.bookingId, bookingIds))
    .orderBy(asc(bookingItems.sortOrder));
  for (const id of bookingIds) {
    const counts = new Map<string, number>();
    for (const item of items.filter((i) => i.bookingId === id)) {
      const name = item.roomType ?? item.offering ?? "Item";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    result.set(id, [...counts].map(([name, n]) => (n > 1 ? `${name} × ${n}` : name)).join(", "));
  }
  return result;
}

/** Everything the booking page shows (ADM-04), or null when the resort has no such booking. */
export async function loadBooking(propertyId: string, number: string) {
  const db = getDb();
  const [found] = await db
    .select({ booking: bookings, guest: guests })
    .from(bookings)
    .innerJoin(guests, eq(guests.id, bookings.guestId))
    .where(and(eq(bookings.propertyId, propertyId), eq(bookings.number, number.toUpperCase())));
  if (!found) return null;
  const id = found.booking.id;

  // One query after another: they share the pool, and each is small.
  const items = await db
    .select({
      item: bookingItems,
      roomTypeName: roomTypes.name,
      unitName: units.name,
      offeringName: offerings.name,
      slotLabel: offeringSlots.label,
    })
    .from(bookingItems)
    .leftJoin(roomTypes, eq(roomTypes.id, bookingItems.roomTypeId))
    .leftJoin(units, eq(units.id, bookingItems.unitId))
    .leftJoin(offerings, eq(offerings.id, bookingItems.offeringId))
    .leftJoin(offeringSlots, eq(offeringSlots.id, bookingItems.slotId))
    .where(eq(bookingItems.bookingId, id))
    .orderBy(asc(bookingItems.sortOrder));
  const payments = await db.select().from(offlinePayments).where(eq(offlinePayments.bookingId, id)).orderBy(asc(offlinePayments.receivedAt));
  const events = await db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, id)).orderBy(desc(bookingEvents.at), desc(bookingEvents.id));
  const [hold] = await db.select({ status: holds.status, expiresAt: holds.expiresAt }).from(holds).where(eq(holds.bookingId, id));
  const bands = await db.select({ code: ageBands.code, label: ageBands.label }).from(ageBands).where(eq(ageBands.propertyId, propertyId)).orderBy(asc(ageBands.sortOrder));

  const userIds = [...new Set([found.booking.createdBy, ...events.map((e) => e.userId), ...payments.map((p) => p.createdBy)].filter((u): u is string => Boolean(u)))];
  const people = userIds.length ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds)) : [];

  return { ...found, items, payments, events, hold: hold ?? null, bands, people: new Map(people.map((p) => [p.id, p.name])) };
}

export type LoadedBooking = NonNullable<Awaited<ReturnType<typeof loadBooking>>>;
