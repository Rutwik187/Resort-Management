"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { can } from "@repo/auth";
import { bookings, getDb, refunds } from "@repo/db";
import { createPaymentLink, decideRefund, NotFoundError, requestRefund, retryRefund } from "@repo/engine";
import { rupees } from "@/lib/format";
import { filled, problem, rupeesField, type FormState } from "@/lib/forms";
import { audit, currentStaff, requirePermission } from "@/lib/staff";

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
    refresh();
    return now.status === "failed" ? { error: `It failed again: ${now.error}` } : { done: "Refund sent again." };
  } catch (error) {
    return problem(error, "Your role can't start refunds.");
  }
}
