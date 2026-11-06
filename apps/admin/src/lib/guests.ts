import "server-only";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { bookings, getDb, guestProfiles, guests, leads, properties } from "@repo/db";
import type { BookingStatus } from "@repo/engine";

/*
 * Guests (ADM-09, ADM-10). Each booking keeps its own guests row; a guest
 * is every row with the same phone, or the same email when there is no
 * phone. So a guest's history comes together however they booked.
 */

const sold: BookingStatus[] = ["part_paid", "confirmed", "checked_in", "checked_out", "no_show"];
/** The key that joins a guest's rows: "p:919876543210", "e:name@example.com", or the row's own id. */
const keyOf = sql<string>`coalesce('p:' || ${guests.phone}, 'e:' || lower(${guests.email}), 'g:' || ${guests.id}::text)`;
export const profileKey = (guest: { id: string; phone: string | null; email: string | null }) =>
  guest.phone ? `p:${guest.phone}` : guest.email ? `e:${guest.email.toLowerCase()}` : `g:${guest.id}`;

const likeText = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** A resort's guests, newest booking first: what they booked, spent, and when they last came. At most 200. */
export async function findGuests(propertyId: string, filters: { q?: string; returning?: boolean }) {
  const db = getDb();
  const isSold = inArray(bookings.status, sold);
  const arrival = sql`coalesce(${bookings.checkIn}, ${bookings.visitDate})`;
  const q = filters.q?.trim();
  const digits = q?.replace(/\D/g, "") ?? "";
  const search: SQL | undefined = q ? or(ilike(guests.name, likeText(q)), ilike(guests.email, likeText(q)), digits.length >= 4 ? ilike(guests.phone, likeText(digits)) : undefined) : undefined;
  const paid = sql<number>`count(distinct ${bookings.id}) filter (where ${isSold})`;
  const rows = await db
    .select({
      key: keyOf,
      guestId: sql<string>`(array_agg(${guests.id} order by ${bookings.createdAt} desc))[1]`,
      name: sql<string>`(array_agg(${guests.name} order by ${bookings.createdAt} desc))[1]`,
      phone: sql<string | null>`max(${guests.phone})`,
      email: sql<string | null>`max(${guests.email})`,
      bookings: paid.mapWith(Number),
      spent: sql<number>`coalesce(sum(${bookings.totalPaise}) filter (where ${isSold}), 0)`.mapWith(Number),
      lastVisit: sql<string | null>`max(${arrival}) filter (where ${isSold})`,
      lastBooked: sql<Date>`max(${bookings.createdAt})`,
    })
    .from(guests)
    .innerJoin(bookings, eq(bookings.guestId, guests.id))
    .where(and(eq(bookings.propertyId, propertyId), search))
    .groupBy(keyOf)
    .having(filters.returning ? sql`${paid} >= 2` : undefined)
    .orderBy(sql`max(${bookings.createdAt}) desc`)
    .limit(200);
  const profiles = rows.length ? await db.select().from(guestProfiles).where(inArray(guestProfiles.key, rows.map((r) => r.key))) : [];
  return rows.map((row) => ({ ...row, lastBooked: new Date(row.lastBooked), tags: profiles.find((p) => p.key === row.key)?.tags ?? [] }));
}

/** One guest: their rows, their bookings at the resorts this person can see, staff's notes, and their leads. */
export async function loadGuest(guestId: string, propertyIds: string[]) {
  const db = getDb();
  const [row] = await db.select().from(guests).where(eq(guests.id, guestId));
  if (!row) return null;
  const key = profileKey(row);
  const same = row.phone ? eq(guests.phone, row.phone) : row.email ? sql`lower(${guests.email}) = ${row.email.toLowerCase()}` : eq(guests.id, row.id);
  const rows = await db.select().from(guests).where(same);
  const history = propertyIds.length
    ? await db
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
          code: properties.code,
        })
        .from(bookings)
        .innerJoin(properties, eq(properties.id, bookings.propertyId))
        .where(and(inArray(bookings.guestId, rows.map((r) => r.id)), inArray(bookings.propertyId, propertyIds)))
        .orderBy(desc(bookings.createdAt))
    : [];
  const [profile] = await db.select().from(guestProfiles).where(eq(guestProfiles.key, key));
  const theirLeads =
    propertyIds.length && (row.phone || row.email)
      ? await db
          .select({ id: leads.id, status: leads.status, interest: leads.interest, createdAt: leads.createdAt, code: properties.code })
          .from(leads)
          .innerJoin(properties, eq(properties.id, leads.propertyId))
          .where(and(inArray(leads.propertyId, propertyIds), row.phone ? eq(leads.phone, row.phone) : sql`lower(${leads.email}) = ${row.email!.toLowerCase()}`))
          .orderBy(desc(leads.createdAt))
      : [];
  // The newest details are the ones to show: guests correct their email or company over time.
  const latest = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return { key, row: latest, rows, history, profile: profile ?? null, leads: theirLeads };
}
