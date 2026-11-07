"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { can } from "@repo/auth";
import { bookings, getDb, properties, refunds } from "@repo/db";
import { after } from "next/server";
import { createPaymentLink, decideRefund, newManageLink, NotFoundError, queueBookingLinkEmail, requestRefund, retryRefund, sendQueuedEmails } from "@repo/engine";
import { rupees } from "@/lib/format";
import { filled, problem, rupeesField, type FormState } from "@/lib/forms";
import { audit, currentStaff, requirePermission } from "@/lib/staff";
import { websiteUrls } from "@/lib/website";

/** Sends any email the change queued, after the response. */
const sendMail = (bookingId: string) => after(() => sendQueuedEmails(getDb(), { bookingId }).catch((error) => console.error("Sending email failed; the batch job retries.", error)));

async function propertyOf(bookingId: string) {
  z.uuid({ error: "That booking no longer exists." }).parse(bookingId);
  const [booking] = await getDb().select({ propertyId: bookings.propertyId, number: bookings.number }).from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) throw new NotFoundError("Booking");
  return booking;
}

/** A Razorpay payment link for the balance, or an amount staff choose. Razorpay texts and emails it. */
export async function sendPaymentLink(bookingId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const booking = await propertyOf(bookingId);
    const staff = await requirePermission("bookings.modify", booking.propertyId);
    const { amount } = z.object({ amount: rupeesField("Amount").optional() }).parse(filled(form));
    const link = await createPaymentLink(getDb(), { bookingId, amountPaise: amount, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: booking.propertyId, action: "booking.payment_link", entity: "online_payments", entityId: link.id, after: { amountPaise: link.amountPaise, url: link.linkUrl } });
    refresh();
    return { done: `Link for ${rupees(link.amountPaise)} sent to the guest.` };
  } catch (error) {
    return problem(error, "Your role can't take payments.");
  }
}

const refundInput = z.object({
  amount: rupeesField("Amount"),
  method: z.enum(["razorpay", "cash", "upi", "card", "bank_transfer", "cheque", "other"], { error: "Choose how the money goes back." }),
  reason: z.string().trim().min(3, "Say why the money goes back.").max(500),
  reference: z.string().trim().max(120).optional(),
});

/**
 * Asks for a refund. Someone who may approve refunds starts it at once;
 * Accounts start one at once within the resort's limit; anyone else's waits.
 */
export async function askRefund(bookingId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const booking = await propertyOf(bookingId);
    const staff = await currentStaff();
    const canApprove = can(staff, "refunds.approve", booking.propertyId);
    const canInitiate = can(staff, "refunds.initiate", booking.propertyId);
    if (!canApprove && !canInitiate) await requirePermission("refunds.request", booking.propertyId);
    const input = refundInput.parse(filled(form));
    const refund = await requestRefund(getDb(), { bookingId, amountPaise: input.amount, method: input.method, reason: input.reason, reference: input.reference, userId: staff!.userId, canApprove, canInitiate });
    await audit({ userId: staff!.userId, propertyId: booking.propertyId, action: "refund.request", entity: "refunds", entityId: refund.id, after: refund });
    sendMail(bookingId);
    refresh();
    if (refund.status === "requested") return { done: `Refund of ${rupees(input.amount)} asked for. It waits for approval.` };
    if (refund.status === "failed") return { error: `The refund failed: ${refund.error}` };
    return { done: refund.status === "processed" ? `${rupees(input.amount)} refunded.` : `Refund of ${rupees(input.amount)} sent to Razorpay.` };
  } catch (error) {
    return problem(error, "Your role can't ask for refunds.");
  }
}

async function refundOf(refundId: string) {
  z.uuid().parse(refundId);
  const [refund] = await getDb().select().from(refunds).where(eq(refunds.id, refundId));
  if (!refund) throw new NotFoundError("Refund");
  return refund;
}

export async function approveRefund(refundId: string, approve: boolean): Promise<FormState> {
  try {
    const refund = await refundOf(refundId);
    const staff = await requirePermission("refunds.approve", refund.propertyId);
    await decideRefund(getDb(), { refundId, approve, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: refund.propertyId, action: approve ? "refund.approve" : "refund.reject", entity: "refunds", entityId: refundId, before: refund });
    sendMail(refund.bookingId);
    refresh();
    return { done: approve ? `Refund of ${rupees(refund.amountPaise)} approved.` : "Refund rejected." };
  } catch (error) {
    return problem(error, "Only someone who may approve refunds can do this.");
  }
}

export async function tryRefundAgain(refundId: string): Promise<FormState> {
  try {
    const refund = await refundOf(refundId);
    const staff = await currentStaff();
    if (!can(staff, "refunds.approve", refund.propertyId)) await requirePermission("refunds.initiate", refund.propertyId);
    await retryRefund(getDb(), refundId);
    const [now] = await getDb().select().from(refunds).where(eq(refunds.id, refundId));
    sendMail(refund.bookingId);
    refresh();
    return now.status === "failed" ? { error: `It failed again: ${now.error}` } : { done: "Refund sent again." };
  } catch (error) {
    return problem(error, "Your role can't start refunds.");
  }
}

/**
 * Gives the guest a fresh private booking page on the resort's website and
 * emails it: their booking, invoices, and the balance to pay online. Any
 * earlier link stops working.
 */
export async function sendBookingPage(bookingId: string): Promise<FormState> {
  try {
    const booking = await propertyOf(bookingId);
    const staff = await requirePermission("bookings.modify", booking.propertyId);
    const [row] = await getDb().select({ code: properties.code }).from(properties).where(eq(properties.id, booking.propertyId));
    const site = websiteUrls()[row.code];
    if (!site) return { error: "This resort's website address isn't set (WEBSITE_URLS)." };
    const token = await newManageLink(getDb(), bookingId);
    const url = `${site.replace(/\/$/, "")}/booking?ref=${token}`;
    const emailed = await queueBookingLinkEmail(getDb(), bookingId, url);
    await audit({ userId: staff.userId, propertyId: booking.propertyId, action: "booking.link", entity: "bookings", entityId: bookingId });
    if (emailed) sendMail(bookingId);
    refresh();
    return { done: emailed ? `Booking page emailed to the guest. Its address: ${url}` : `No email on the booking. Send this address on WhatsApp: ${url}` };
  } catch (error) {
    return problem(error, "Your role can't change bookings.");
  }
}
