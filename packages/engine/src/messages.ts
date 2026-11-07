import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { bookings, guests, messages, properties, type Database } from "@repo/db";
import type { Tx } from "./bookings";
import type { Quote } from "./holds";

/*
 * Email through an outbox (docs/implementation-plan.md, section 8). A
 * message is written in the same transaction as the change it reports.
 * Messages that depend on a payment are held, released when the money
 * arrives and cancelled if it never does. Sending is a separate step, after
 * the request or in the batch job, through Resend's API with the message id
 * as the idempotency key. Without RESEND_API_KEY, messages wait.
 */

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const longDay = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** A plain, branded email: the resort's name, a heading, rows, a button and a footer. */
function layout(input: { resort: string; heading: string; intro: string; rows?: [string, string][]; button?: { label: string; url: string }; footer: string }) {
  const rows = (input.rows ?? [])
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b7280">${esc(k)}</td><td style="padding:6px 0;text-align:right">${esc(v)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:32px">
<tr><td style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">${esc(input.resort)}</td></tr>
<tr><td style="padding-top:8px;font-size:24px;font-weight:600">${esc(input.heading)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#44403c">${esc(input.intro)}</td></tr>
${rows ? `<tr><td style="padding-top:20px"><table role="presentation" width="100%" style="font-size:15px;border-top:1px solid #e7e5e4">${rows}</table></td></tr>` : ""}
${input.button ? `<tr><td style="padding-top:24px"><a href="${esc(input.button.url)}" style="display:inline-block;background:#1f4d36;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${esc(input.button.label)}</a></td></tr>` : ""}
<tr><td style="padding-top:28px;font-size:13px;line-height:1.6;color:#6b7280">${esc(input.footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [input.resort, "", input.heading, "", input.intro, "", ...(input.rows ?? []).map(([k, v]) => `${k}: ${v}`), input.button ? `\n${input.button.label}: ${input.button.url}` : "", "", input.footer].join("\n");
  return { html, text };
}

type BookingRow = typeof bookings.$inferSelect;

async function context(tx: Tx | Database, booking: BookingRow) {
  const [property] = await tx.select().from(properties).where(eq(properties.id, booking.propertyId));
  const [guest] = await tx.select().from(guests).where(eq(guests.id, booking.guestId));
  const contact = [property.phone ? `+${property.phone}` : null, property.email].filter(Boolean).join(" or ");
  return { property, guest, footer: `Booking ${booking.number}. To change or cancel it, reply to this email${contact ? ` or contact us at ${contact}` : ""}.` };
}

function whenRows(booking: BookingRow): [string, string][] {
  return booking.checkIn && booking.checkOut
    ? [
        ["Check-in", longDay(booking.checkIn)],
        ["Check-out", longDay(booking.checkOut)],
      ]
    : booking.visitDate
      ? [["Date", longDay(booking.visitDate)]]
      : [];
}

/**
 * The confirmation email for a website booking, held until the booking is
 * paid. Written when the booking is made, while its private link is known.
 */
export async function holdConfirmationEmail(tx: Tx, bookingId: string, manageUrl: string) {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
  const { property, guest, footer } = await context(tx, booking);
  if (!guest.email) return;
  const quote = booking.quote as Quote;
  const lines = quote.lines.map((line): [string, string] => [line.kind === "stay" ? line.roomTypeName : `${line.offeringName}, ${line.slotLabel}`, line.totalPaise === null ? "" : rupees(line.totalPaise)]);
  const body = layout({
    resort: property.name,
    heading: `You're booked, ${guest.name.split(" ")[0]}`,
    intro: `Thank you for booking with ${property.name}. Your booking ${booking.number} is confirmed. Your booking page has the details, your GST invoice and any balance to pay.`,
    rows: [
      ...whenRows(booking),
      ...lines,
      ["Price before GST", booking.subtotalPaise === null ? "" : rupees(booking.subtotalPaise)],
      ["GST", booking.taxPaise === null ? "" : rupees(booking.taxPaise)],
      ["Total", booking.totalPaise === null ? "To be confirmed" : rupees(booking.totalPaise)],
    ],
    button: { label: "Open your booking", url: manageUrl },
    footer,
  });
  await tx.insert(messages).values({ propertyId: booking.propertyId, bookingId, kind: "booking_confirmed", to: guest.email, subject: `Booking confirmed: ${booking.number}, ${property.name}`, ...body, status: "held" });
}

/** Releases a booking's held messages once it is paid: they go at the next send. */
export async function releaseHeldMessages(tx: Tx, bookingId: string) {
  await tx.update(messages).set({ status: "queued" }).where(and(eq(messages.bookingId, bookingId), eq(messages.status, "held")));
}

/** Cancels a booking's held messages: it was never paid. */
export async function cancelHeldMessages(tx: Tx, bookingId: string) {
  await tx.update(messages).set({ status: "cancelled" }).where(and(eq(messages.bookingId, bookingId), eq(messages.status, "held")));
}

/** Tells the guest money they paid has gone back. */
export async function queueRefundEmail(tx: Tx, bookingId: string, amountPaise: number) {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
  const { property, guest, footer } = await context(tx, booking);
  if (!guest.email) return;
  const body = layout({
    resort: property.name,
    heading: `${rupees(amountPaise)} refunded`,
    intro: `We have refunded ${rupees(amountPaise)} for booking ${booking.number}, the way you paid. Banks usually take 5 to 7 working days to show it.`,
    rows: whenRows(booking),
    footer,
  });
  await tx.insert(messages).values({ propertyId: booking.propertyId, bookingId, kind: "refund", to: guest.email, subject: `Refund of ${rupees(amountPaise)} for ${booking.number}`, ...body });
}

/** Sends the guest their private booking page, such as for a booking made at the desk. */
export async function queueBookingLinkEmail(db: Database, bookingId: string, manageUrl: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const { property, guest, footer } = await context(db, booking);
  if (!guest.email) return false;
  const balance = booking.totalPaise === null ? null : booking.totalPaise - booking.paidPaise;
  const body = layout({
    resort: property.name,
    heading: `Your booking ${booking.number}`,
    intro: `Here is your booking page at ${property.name}. It shows your booking, your GST invoice${balance && balance > 0 ? `, and lets you pay the balance of ${rupees(balance)} online` : ""}.`,
    rows: whenRows(booking),
    button: { label: "Open your booking", url: manageUrl },
    footer,
  });
  await db.insert(messages).values({ propertyId: booking.propertyId, bookingId, kind: "booking_link", to: guest.email, subject: `Your booking ${booking.number}, ${property.name}`, ...body });
  return true;
}

/**
 * Sends queued email through Resend. Each message is tried up to five
 * times. Without RESEND_API_KEY or EMAIL_FROM_ADDRESS nothing is sent and
 * the messages wait. Safe to run twice at once: each run claims its rows.
 */
export async function sendQueuedEmails(db: Database, options: { bookingId?: string; limit?: number } = {}) {
  const key = process.env.RESEND_API_KEY?.trim();
  const address = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!key || !address) return { sent: 0, failed: 0, waiting: true };
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ message: messages, resort: properties.name, replyTo: properties.email })
      .from(messages)
      .innerJoin(properties, eq(properties.id, messages.propertyId))
      .where(and(inArray(messages.status, ["queued", "failed"]), lt(messages.attempts, 5), eq(messages.channel, "email"), options.bookingId ? eq(messages.bookingId, options.bookingId) : undefined))
      .orderBy(asc(messages.createdAt))
      .limit(options.limit ?? 50)
      .for("update", { skipLocked: true, of: messages });
    if (rows.length) await tx.update(messages).set({ attempts: sql`${messages.attempts} + 1` }).where(inArray(messages.id, rows.map((r) => r.message.id)));
    return rows;
  });
  let sent = 0;
  let failed = 0;
  for (const { message, resort, replyTo } of claimed) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "idempotency-key": message.id },
        body: JSON.stringify({ from: `${resort} <${address}>`, to: [message.to], subject: message.subject, html: message.html, text: message.text, reply_to: replyTo ?? undefined }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!response.ok) throw new Error(data.message ?? `Resend answered ${response.status}.`);
      await db.update(messages).set({ status: "sent", providerId: data.id ?? null, sentAt: sql`now()`, error: null }).where(eq(messages.id, message.id));
      sent++;
    } catch (error) {
      await db.update(messages).set({ status: "failed", error: error instanceof Error ? error.message : String(error) }).where(eq(messages.id, message.id));
      failed++;
    }
  }
  return { sent, failed, waiting: false };
}
