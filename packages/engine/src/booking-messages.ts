import { and, eq, inArray, sql } from "drizzle-orm";
import { bookings, guests, messages, properties, roomTypes, stayRules, unitNights, units, type Database } from "@repo/db";
import type { Tx } from "./bookings";
import { addDays, todayInIndia } from "./dates";
import { lineTitle, type Quote } from "./holds";
import { bookingVars, context, layout, rupees, whenRows, type BookingRow } from "./messages";
import { wording } from "./templates";

/*
 * The booking messages of URD 9.2, through the outbox: the guest hears
 * about changes and cancellations, two days before arrival, and the day
 * after check-out with the review link; the resort's team (Settings, team
 * emails) hears about new bookings, changes, cancellations and refunds, and
 * low rooms. Each is kept against its booking (NOT-05). Jobs skip what they
 * have already written, so a second run sends nothing twice.
 */

async function teamOf(tx: Tx | Database, propertyId: string) {
  const [property] = await tx.select({ name: properties.name, teamEmails: properties.teamEmails, email: properties.email }).from(properties).where(eq(properties.id, propertyId));
  const list = property.teamEmails.length ? property.teamEmails : property.email ? [property.email] : [];
  return { name: property.name, list };
}

/** Tells the resort's team about a booking event, such as a new paid booking or a cancellation. */
export async function queueTeamAlert(tx: Tx | Database, booking: BookingRow, event: { kind: string; heading: string; intro: string }) {
  const team = await teamOf(tx, booking.propertyId);
  if (!team.list.length) return;
  const [guest] = await tx.select().from(guests).where(eq(guests.id, booking.guestId));
  const body = layout({
    resort: team.name,
    heading: event.heading,
    intro: event.intro,
    rows: [["Booking", booking.number], ["Guest", guest.name], ...(guest.phone ? ([["Phone", `+${guest.phone}`]] as [string, string][]) : []), ...whenRows(booking), ["Total", booking.totalPaise === null ? "To be confirmed" : rupees(booking.totalPaise)], ["Paid", rupees(booking.paidPaise)]],
    footer: "Sent by the Prathamesh admin to this resort's team. Change who gets these in Settings.",
  });
  for (const to of team.list) await tx.insert(messages).values({ propertyId: booking.propertyId, bookingId: booking.id, kind: event.kind, to, subject: `${event.heading}: ${booking.number}`, ...body });
}

/** A booking was paid for the first time: the team hears of it (URD 9.2, booking confirmed). */
export async function queueNewBookingAlert(tx: Tx, bookingId: string) {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return;
  const quote = booking.quote as Quote;
  await queueTeamAlert(tx, booking, { kind: "team_new_booking", heading: "New booking", intro: `${quote.lines.map(lineTitle).join(", ")}. Booked ${booking.source === "website" ? "on the website" : "at the desk"}.` });
}

/** A booking's dates, rooms or guests changed: the guest gets the new details, and the team hears of it. */
export async function queueBookingChanged(tx: Tx, bookingId: string, change: { fromTotal: number | null; reason?: string }) {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
  const { property, guest, footer } = await context(tx, booking);
  const vars = bookingVars(booking, guest, property);
  if (guest.email) {
    const words = await wording(tx, booking.propertyId, "booking_changed", vars, {
      subject: `Your booking ${booking.number} has changed`,
      intro: `We have changed your booking ${booking.number} at ${property.name}. The new details are below.${vars.balance && booking.totalPaise !== null && booking.totalPaise > booking.paidPaise ? ` ${vars.balance} is still to pay.` : ""}`,
    });
    const quote = booking.quote as Quote;
    const body = layout({
      resort: property.name,
      heading: "Your booking has changed",
      intro: words.intro,
      rows: [...whenRows(booking), ...quote.lines.map((line): [string, string] => [lineTitle(line), line.totalPaise === null ? "" : rupees(line.totalPaise)]), ["Total", booking.totalPaise === null ? "To be confirmed" : rupees(booking.totalPaise)]],
      footer,
    });
    await tx.insert(messages).values({ propertyId: booking.propertyId, bookingId, kind: "booking_changed", to: guest.email, subject: words.subject, ...body });
  }
  const before = change.fromTotal === null ? "" : ` The total went from ${rupees(change.fromTotal)} to ${booking.totalPaise === null ? "to be confirmed" : rupees(booking.totalPaise)}.`;
  await queueTeamAlert(tx, booking, { kind: "team_booking_changed", heading: "Booking changed", intro: `${change.reason ?? "The stay was changed."}${before}` });
}

/** A booking was cancelled: the guest hears of it, and the team (URD 9.2). Refunds send their own message. */
export async function queueBookingCancelled(tx: Tx, bookingId: string, reason?: string) {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
  const { property, guest, footer } = await context(tx, booking);
  if (guest.email && booking.paidPaise > 0) {
    const words = await wording(tx, booking.propertyId, "booking_cancelled", bookingVars(booking, guest, property), {
      subject: `Booking ${booking.number} cancelled`,
      intro: `Your booking ${booking.number} at ${property.name} is cancelled. If money is due back to you, we send it the way you paid and email you when it goes.`,
    });
    const body = layout({ resort: property.name, heading: "Your booking is cancelled", intro: words.intro, rows: whenRows(booking), footer });
    await tx.insert(messages).values({ propertyId: booking.propertyId, bookingId, kind: "booking_cancelled", to: guest.email, subject: words.subject, ...body });
  }
  if (booking.paidPaise > 0 || booking.source !== "website") await queueTeamAlert(tx, booking, { kind: "team_booking_cancelled", heading: "Booking cancelled", intro: reason ? `Reason: ${reason}` : "The booking was cancelled." });
}

/** Already written for this booking and kind? Jobs use it so a second run writes nothing. */
async function alreadySent(db: Database, kind: string, bookingIds: string[]) {
  if (!bookingIds.length) return new Set<string>();
  const rows = await db.select({ bookingId: messages.bookingId }).from(messages).where(and(eq(messages.kind, kind), inArray(messages.bookingId, bookingIds)));
  return new Set(rows.map((r) => r.bookingId));
}

/**
 * The guest's journey (URD 9.2): two days before arrival, check-in time,
 * directions and the contact number; the day after check-out, a thank-you
 * with the resort's Google review link (REV-05).
 */
export async function queueGuestJourney(db: Database, today = todayInIndia()) {
  const soon = addDays(today, 2);
  const arriving = await db
    .select({ booking: bookings })
    .from(bookings)
    .where(and(inArray(bookings.status, ["confirmed", "part_paid"]), sql`coalesce(${bookings.checkIn}, ${bookings.visitDate}) = ${soon}`));
  const yesterday = addDays(today, -1);
  const left = await db.select({ booking: bookings }).from(bookings).where(and(eq(bookings.status, "checked_out"), sql`coalesce(${bookings.checkOut}, ${bookings.visitDate}) = ${yesterday}`));
  const sentBefore = await alreadySent(db, "pre_arrival", arriving.map((a) => a.booking.id));
  const sentAfter = await alreadySent(db, "thank_you", left.map((a) => a.booking.id));
  let queued = 0;
  for (const { booking } of arriving) {
    if (sentBefore.has(booking.id)) continue;
    const { property, guest, footer } = await context(db, booking);
    if (!guest.email) continue;
    const vars = bookingVars(booking, guest, property);
    const words = await wording(db, booking.propertyId, "pre_arrival", vars, {
      subject: `See you soon at ${property.name}`,
      intro: `We look forward to welcoming you ${booking.checkIn ? `on ${vars.checkIn}. Check-in is from ${vars.checkInTime}` : `on ${vars.visitDate}`}.${vars.phone ? ` If you need anything on the way, call ${vars.phone}.` : ""}`,
    });
    const body = layout({
      resort: property.name,
      heading: `See you soon, ${vars.guestName}`,
      intro: words.intro,
      rows: [...whenRows(booking), ...(vars.balance && booking.totalPaise !== null && booking.totalPaise > booking.paidPaise ? ([["To pay at the resort", vars.balance]] as [string, string][]) : [])],
      button: property.mapsUrl ? { label: "Directions", url: property.mapsUrl } : undefined,
      footer,
    });
    await db.insert(messages).values({ propertyId: booking.propertyId, bookingId: booking.id, kind: "pre_arrival", to: guest.email, subject: words.subject, ...body });
    queued++;
  }
  for (const { booking } of left) {
    if (sentAfter.has(booking.id)) continue;
    const { property, guest, footer } = await context(db, booking);
    if (!guest.email) continue;
    const vars = bookingVars(booking, guest, property);
    const words = await wording(db, booking.propertyId, "thank_you", vars, {
      subject: `Thank you for staying with ${property.name}`,
      intro: `Thank you for your visit, ${vars.guestName}. We hope you had a lovely time.${property.reviewUrl ? " A short Google review helps other families find us." : ""}`,
    });
    const body = layout({ resort: property.name, heading: "Thank you for coming", intro: words.intro, button: property.reviewUrl ? { label: "Write a review", url: property.reviewUrl } : undefined, footer });
    await db.insert(messages).values({ propertyId: booking.propertyId, bookingId: booking.id, kind: "thank_you", to: guest.email, subject: words.subject, ...body });
    queued++;
  }
  return queued;
}

/**
 * Low rooms (INV-10): once a day, the team hears of each room type with its
 * limit or fewer rooms free on a night in the next 14, or stopped from
 * selling. Room types with no rooms entered are left out.
 */
export async function queueLowRoomsAlerts(db: Database, today = todayInIndia()) {
  const resorts = await db.select().from(properties).where(eq(properties.active, true));
  let queued = 0;
  for (const resort of resorts) {
    const team = resort.teamEmails.length ? resort.teamEmails : resort.email ? [resort.email] : [];
    if (!team.length) continue;
    const subject = `${resort.name}: rooms running low, ${today}`;
    const [already] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.propertyId, resort.id), eq(messages.kind, "low_rooms"), eq(messages.subject, subject)));
    if (already) continue;
    const types = await db
      .select({ id: roomTypes.id, name: roomTypes.name, rooms: sql<number>`count(${units.id})`.mapWith(Number) })
      .from(roomTypes)
      .innerJoin(units, and(eq(units.roomTypeId, roomTypes.id), eq(units.status, "active")))
      .where(and(eq(roomTypes.propertyId, resort.id), eq(roomTypes.status, "active")))
      .groupBy(roomTypes.id);
    if (!types.length) continue;
    const to = addDays(today, 13);
    const taken = await db
      .select({ roomTypeId: units.roomTypeId, night: unitNights.night, n: sql<number>`count(*)`.mapWith(Number) })
      .from(unitNights)
      .innerJoin(units, eq(units.id, unitNights.unitId))
      .where(and(eq(unitNights.propertyId, resort.id), sql`${unitNights.night} between ${today} and ${to}`, sql`(${unitNights.bookingId} is not null or ${unitNights.blockId} is not null)`))
      .groupBy(units.roomTypeId, unitNights.night);
    const stopped = await db
      .select({ roomTypeId: stayRules.roomTypeId, night: stayRules.night })
      .from(stayRules)
      .where(and(inArray(stayRules.roomTypeId, types.map((t) => t.id)), sql`${stayRules.night} between ${today} and ${to}`, eq(stayRules.stopSell, true)));
    const rows: [string, string][] = [];
    for (const type of types) {
      const low: string[] = [];
      for (let night = today; night <= to; night = addDays(night, 1)) {
        const free = type.rooms - (taken.find((t) => t.roomTypeId === type.id && t.night === night)?.n ?? 0);
        const stop = stopped.some((s) => s.roomTypeId === type.id && s.night === night);
        if (stop || free <= resort.lowStockThreshold) low.push(`${new Date(`${night}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })} (${stop ? "stopped" : free === 0 ? "full" : `${free} left`})`);
      }
      if (low.length) rows.push([type.name, low.slice(0, 6).join(", ") + (low.length > 6 ? ` and ${low.length - 6} more` : "")]);
    }
    if (!rows.length) continue;
    const body = layout({
      resort: resort.name,
      heading: "Rooms running low",
      intro: `These room types have ${resort.lowStockThreshold} or fewer rooms free on some nights in the next two weeks. Raise prices, stop selling, or release rooms held for others, as you see fit.`,
      rows,
      footer: "Sent once a day by the Prathamesh admin to this resort's team. The limit is in Settings.",
    });
    for (const address of team) await db.insert(messages).values({ propertyId: resort.id, kind: "low_rooms", to: address, subject, ...body });
    queued++;
  }
  return queued;
}
