import { and, eq, inArray, sql } from "drizzle-orm";
import { bookings, leads, messages, offlinePayments, onlinePayments, properties, unitNights, units, type Database } from "@repo/db";
import { addDays, todayInIndia } from "./dates";
import { layout } from "./messages";

/*
 * Sales summaries by email (RPT-01): every evening the day's figures, on
 * Mondays the past week's, and on the 1st the past month's, to each
 * resort's report recipients (Settings). The daily job runs at 9 pm in
 * India. Each summary is written once: a second run the same day finds it
 * and skips it.
 */

const sold = ["part_paid", "confirmed", "checked_in", "checked_out", "no_show"] as const;
const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const day = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type Figures = { bookings: number; salesPaise: number; receivedPaise: number; cancelled: number; leads: number; leadsWon: number; occupancy: number | null };

async function figures(db: Database, propertyId: string, from: string, to: string): Promise<Figures> {
  const bookedOn = sql`(${bookings.createdAt} at time zone 'Asia/Kolkata')::date`;
  const [sales] = await db
    .select({
      bookings: sql<number>`count(*) filter (where ${inArray(bookings.status, [...sold])})`.mapWith(Number),
      paise: sql<number>`coalesce(sum(${bookings.totalPaise}) filter (where ${inArray(bookings.status, [...sold])}), 0)`.mapWith(Number),
      cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')`.mapWith(Number),
    })
    .from(bookings)
    .where(and(eq(bookings.propertyId, propertyId), sql`${bookedOn} between ${from} and ${to}`));
  const [online] = await db
    .select({ paise: sql<number>`coalesce(sum(${onlinePayments.amountPaise}), 0)`.mapWith(Number) })
    .from(onlinePayments)
    .where(and(eq(onlinePayments.propertyId, propertyId), eq(onlinePayments.status, "paid"), sql`(${onlinePayments.paidAt} at time zone 'Asia/Kolkata')::date between ${from} and ${to}`));
  const [offline] = await db
    .select({ paise: sql<number>`coalesce(sum(${offlinePayments.amountPaise}), 0)`.mapWith(Number) })
    .from(offlinePayments)
    .where(and(eq(offlinePayments.propertyId, propertyId), sql`(${offlinePayments.receivedAt} at time zone 'Asia/Kolkata')::date between ${from} and ${to}`));
  const [leadCount] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number), won: sql<number>`count(*) filter (where ${leads.status} = 'won')`.mapWith(Number) })
    .from(leads)
    .where(and(eq(leads.propertyId, propertyId), sql`(${leads.createdAt} at time zone 'Asia/Kolkata')::date between ${from} and ${to}`));
  const [rooms] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(units).where(and(eq(units.propertyId, propertyId), eq(units.status, "active")));
  const [nights] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(unitNights)
    .where(and(eq(unitNights.propertyId, propertyId), sql`${unitNights.bookingId} is not null`, sql`${unitNights.night} between ${from} and ${to}`));
  const span = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  return {
    bookings: sales.bookings,
    salesPaise: sales.paise,
    receivedPaise: online.paise + offline.paise,
    cancelled: sales.cancelled,
    leads: leadCount.n,
    leadsWon: leadCount.won,
    occupancy: rooms.n ? nights.n / (rooms.n * span) : null,
  };
}

/** Writes the summaries due today for every resort with recipients. Returns how many were queued. */
export async function queueSalesSummaries(db: Database, today = todayInIndia()) {
  const due: { kind: string; label: string; from: string; to: string }[] = [{ kind: "summary_daily", label: `Daily summary, ${day(today)}`, from: today, to: today }];
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  if (weekday === 1) due.push({ kind: "summary_weekly", label: `Weekly summary, ${day(addDays(today, -7))} to ${day(addDays(today, -1))}`, from: addDays(today, -7), to: addDays(today, -1) });
  if (today.endsWith("-01")) {
    const lastMonthEnd = addDays(today, -1);
    const first = `${lastMonthEnd.slice(0, 8)}01`;
    due.push({ kind: "summary_monthly", label: `Monthly summary, ${new Date(`${first}T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}`, from: first, to: lastMonthEnd });
  }
  const resorts = await db.select().from(properties).where(eq(properties.active, true));
  let queued = 0;
  for (const resort of resorts) {
    if (resort.reportEmails.length === 0) continue;
    for (const summary of due) {
      const subject = `${resort.name}: ${summary.label}`;
      const [already] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.propertyId, resort.id), eq(messages.kind, summary.kind), eq(messages.subject, subject)));
      if (already) continue;
      const f = await figures(db, resort.id, summary.from, summary.to);
      const body = layout({
        resort: resort.name,
        heading: summary.label,
        intro: `${f.bookings} ${f.bookings === 1 ? "booking" : "bookings"} worth ${rupees(f.salesPaise)} with GST, and ${rupees(f.receivedPaise)} received.`,
        rows: [
          ["Bookings made", String(f.bookings)],
          ["Sales, with GST", rupees(f.salesPaise)],
          ["Money received", rupees(f.receivedPaise)],
          ["Cancelled", String(f.cancelled)],
          ["Rooms booked", f.occupancy === null ? "No rooms entered" : `${Math.round(f.occupancy * 100)}%`],
          ["New leads", `${f.leads}${f.leadsWon ? `, ${f.leadsWon} booked` : ""}`],
        ],
        footer: "Sent by the Prathamesh admin to this resort's report recipients. Change them in Settings. The Reports page has the full figures.",
      });
      for (const to of resort.reportEmails) {
        await db.insert(messages).values({ propertyId: resort.id, kind: summary.kind, to, subject, ...body });
        queued++;
      }
    }
  }
  return queued;
}
