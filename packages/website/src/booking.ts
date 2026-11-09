import "server-only";
import { headers } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { CheckoutOrder, ConfirmResult, OnlineChoice, OnlineGuest, StartResult } from "@repo/booking-ui";
import { getDb, onlinePayments, properties } from "@repo/db";
import {
  bookingForGuest,
  bookOnline,
  completeCheckout,
  lineTitle,
  NotFoundError,
  payBalanceOnline,
  recheckOnlinePayments,
  RuleError,
  sendQueuedEmails,
  SoldOutError,
  takesOnlineBookings,
  TransitionError,
  type Party,
} from "@repo/engine";
import type { PropertyCode } from "@repo/sites";
import { catalogueTag } from "./index";

/*
 * Booking and paying on a resort's website (docs/implementation-plan.md,
 * section 10). Each site's server actions call these with its own code.
 * Everything from the browser is checked here; prices come only from the
 * engine. Failures the guest can act on come back in words; anything else
 * is logged and the guest is offered WhatsApp.
 */

/** Whether the resort takes bookings online: it has payment keys. Cached with its catalogue, which the admin refreshes when keys change. */
export async function onlineBookingOpen(code: PropertyCode) {
  if (!process.env.DATABASE_URL) return false;
  try {
    return await cachedOpen(code);
  } catch (error) {
    console.error(`Couldn't tell whether ${code} takes online bookings.`, error);
    return false;
  }
}

async function cachedOpen(code: PropertyCode) {
  "use cache";
  cacheTag(catalogueTag(code));
  cacheLife("hours");
  return takesOnlineBookings(getDb(), code);
}

const day = z.iso.date();
const widgetParty = z.object({
  adults: z.number().int().min(1).max(60),
  children5to11: z.number().int().min(0).max(60),
  children3to5: z.number().int().min(0).max(60),
  under3: z.number().int().min(0).max(60),
});
const code = z.string().trim().min(1).max(80);
const extras = z.array(z.object({ code, quantity: z.number().int().min(1).max(100) })).max(20).optional();
const choiceInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("stay"), checkIn: day, checkOut: day, rooms: z.array(z.object({ code, party: widgetParty })).min(1).max(20), addons: extras }),
  z.object({ kind: z.literal("day"), date: day, passes: z.array(z.object({ code, party: widgetParty })).min(1).max(20), addons: extras }),
]);
const guestInput = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  email: z.email().max(160),
  companyName: z.string().trim().max(160),
  companyGstin: z.string().trim().max(15),
  note: z.string().trim().max(1000),
  marketing: z.boolean(),
  acceptedTerms: z.boolean(),
});

/** The widget's age groups, as the admin's age band codes. */
const toParty = (party: z.infer<typeof widgetParty>): Party => ({
  adults: party.adults,
  children: Object.fromEntries(
    Object.entries({ child_5_11: party.children5to11, child_3_5: party.children3to5, infant: party.under3 }).filter(([, n]) => n > 0),
  ),
});

const guestError = (error: unknown) =>
  error instanceof RuleError || error instanceof SoldOutError || error instanceof NotFoundError || error instanceof TransitionError || error instanceof RangeError;

/** Holds and prices the guest's choice, books it as waiting for payment, and opens the payment. */
export async function startOnlineBooking(siteCode: PropertyCode, choice: OnlineChoice, guest: OnlineGuest): Promise<StartResult> {
  const parsedChoice = choiceInput.safeParse(choice);
  const parsedGuest = guestInput.safeParse(guest);
  if (!parsedChoice.success) return { ok: false, error: "Something in your choice isn't right. Please check the dates and guests." };
  if (!parsedGuest.success) return { ok: false, error: "Please check your name, mobile number and email." };
  const c = parsedChoice.data;
  const g = parsedGuest.data;
  const head = await headers();
  const forwarded = head.get("x-forwarded-for");
  const host = head.get("x-forwarded-host") ?? head.get("host");
  const proto = head.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  try {
    const started = await bookOnline(getDb(), {
      propertyCode: siteCode,
      stay: c.kind === "stay" ? { checkIn: c.checkIn, checkOut: c.checkOut, rooms: c.rooms.map((r) => ({ code: r.code, party: toParty(r.party) })) } : undefined,
      day: c.kind === "day" ? { date: c.date, passes: c.passes.map((p) => ({ code: p.code, party: toParty(p.party) })) } : undefined,
      addons: c.addons,
      guest: { name: g.name, phone: g.phone, email: g.email, companyName: g.companyName || undefined, companyGstin: g.companyGstin || undefined },
      notes: g.note,
      marketing: g.marketing,
      acceptedTerms: g.acceptedTerms,
      ip: forwarded?.split(",")[0]?.trim() ?? null,
      siteOrigin: host ? `${proto}://${host}` : undefined,
    });
    const quote = started.quote;
    return {
      ok: true,
      started: {
        number: started.number,
        url: `/booking?ref=${started.token}`,
        holdExpiresAt: started.holdExpiresAt,
        lines: quote.lines.map((line) => ({
          title: line.kind === "stay" ? `${line.roomTypeName}, ${line.nights.length} ${line.nights.length === 1 ? "night" : "nights"}` : lineTitle(line),
          amountPaise: line.totalPaise,
        })),
        subtotalPaise: quote.subtotalPaise ?? 0,
        taxPaise: quote.taxPaise ?? 0,
        totalPaise: quote.totalPaise ?? 0,
        dueNowPaise: started.dueNowPaise,
        checkout: { ...started.checkout, number: started.number, resortName: started.resortName },
      },
    };
  } catch (error) {
    if (guestError(error)) return { ok: false, error: (error as Error).message, whatsapp: error instanceof RuleError };
    console.error(`An online booking at ${siteCode} failed.`, error);
    return { ok: false, error: "We couldn't hold your booking just now. Please try again, or send the request on WhatsApp.", whatsapp: true };
  }
}

const answerInput = z.object({ orderId: z.string().regex(/^order_\w+$/), paymentId: z.string().regex(/^pay_\w+$/), signature: z.string().regex(/^[0-9a-f]{64}$/) });

/** Checks the payment Razorpay's checkout reports, for an order at this resort, and applies it. */
export async function confirmOnlinePayment(siteCode: PropertyCode, answer: unknown): Promise<ConfirmResult> {
  const parsed = answerInput.safeParse(answer);
  if (!parsed.success) return { ok: false, error: "The payment couldn't be verified." };
  const db = getDb();
  const [row] = await db
    .select({ code: properties.code })
    .from(onlinePayments)
    .innerJoin(properties, eq(properties.id, onlinePayments.propertyId))
    .where(eq(onlinePayments.orderId, parsed.data.orderId));
  if (row?.code !== siteCode) return { ok: false, error: "The payment couldn't be verified." };
  try {
    const { bookingId } = await completeCheckout(db, parsed.data);
    // The confirmation email goes once the guest has their answer.
    after(() => sendQueuedEmails(db, { bookingId }).catch((error) => console.error("Sending the confirmation failed; the batch job retries.", error)));
    return { ok: true };
  } catch (error) {
    if (guestError(error)) return { ok: false, error: (error as Error).message };
    console.error(`Confirming a payment at ${siteCode} failed.`, error);
    return { ok: false, error: "We couldn't confirm the payment yet." };
  }
}

/** The guest's booking, for their private page. Null for an unknown link or another resort's booking. */
export async function guestBooking(siteCode: PropertyCode, token: string) {
  if (!process.env.DATABASE_URL || !/^[\w-]{20,64}$/.test(token)) return null;
  const booking = await bookingForGuest(getDb(), token);
  return booking && booking.resort.code === siteCode ? booking : null;
}

/**
 * Asks Razorpay about a booking still waiting for payment, so a payment
 * whose answer was lost shows at once. The booking page calls it while it
 * waits; it says whether anything changed.
 */
export async function recheckGuestBooking(siteCode: PropertyCode, token: string): Promise<boolean> {
  const booking = await guestBooking(siteCode, token);
  if (!booking || (booking.status !== "pending_payment" && booking.status !== "expired")) return false;
  try {
    const { applied } = await recheckOnlinePayments(getDb(), { bookingId: booking.id });
    if (applied) after(() => sendQueuedEmails(getDb(), { bookingId: booking.id }).catch(() => undefined));
    return applied > 0;
  } catch (error) {
    console.error(`Rechecking booking ${booking.number} failed.`, error);
    return false;
  }
}

/** Opens a payment for what the guest still owes, from their page. */
export async function payGuestBalance(siteCode: PropertyCode, token: string): Promise<{ ok: true; order: CheckoutOrder } | { ok: false; error: string }> {
  if (!/^[\w-]{20,64}$/.test(token)) return { ok: false, error: "This link isn't right." };
  const db = getDb();
  const booking = await bookingForGuest(db, token);
  if (!booking || booking.resort.code !== siteCode) return { ok: false, error: "This link isn't right." };
  try {
    const order = await payBalanceOnline(db, token);
    return { ok: true, order: { ...order, resortName: booking.resort.name } };
  } catch (error) {
    if (guestError(error)) return { ok: false, error: (error as Error).message };
    console.error(`A balance payment at ${siteCode} failed to start.`, error);
    return { ok: false, error: "The payment couldn't start. Please try again." };
  }
}
