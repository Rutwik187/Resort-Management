import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { bookingEvents, bookings, onlinePayments, properties, refunds, type Database } from "@repo/db";
import { allowedMoves, type Tx } from "./bookings";
import { NotFoundError, RuleError } from "./errors";
import { alignInvoiceToKept } from "./invoices";
import { paymentAccount, razorpayFor } from "./online";
import type { PaymentMethod } from "./payments";

/*
 * Refunds (docs/implementation-plan.md, section 6). A refund is asked for,
 * then approved or rejected; one within the resort's limit, asked by
 * someone who may start refunds, is approved at once. An approved refund
 * goes back through Razorpay to the payment it came from, or is paid by
 * hand. Once it is processed, the booking's paid amount drops, a credit
 * note reduces its invoice, and a cancelled booking becomes Refunded.
 */

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

/** What is left to refund on each paid online payment of a booking. */
export async function refundablePayments(db: Database | Tx, bookingId: string) {
  const paid = await db.select().from(onlinePayments).where(and(eq(onlinePayments.bookingId, bookingId), eq(onlinePayments.status, "paid")));
  const used = paid.length
    ? await db
        .select({ id: refunds.onlinePaymentId, paise: sql<number>`coalesce(sum(${refunds.amountPaise}), 0)`.mapWith(Number) })
        .from(refunds)
        .where(and(inArray(refunds.onlinePaymentId, paid.map((p) => p.id)), notInArray(refunds.status, ["failed", "rejected"])))
        .groupBy(refunds.onlinePaymentId)
    : [];
  return paid.map((p) => ({ ...p, refundablePaise: p.amountPaise - (used.find((u) => u.id === p.id)?.paise ?? 0) })).filter((p) => p.refundablePaise > 0);
}

export type RefundRequest = {
  bookingId: string;
  amountPaise: number;
  reason: string;
  /** "razorpay" sends it back to an online payment; otherwise how staff pay it. */
  method: "razorpay" | PaymentMethod;
  reference?: string;
  userId?: string;
  /** The person may approve refunds of any amount. */
  canApprove?: boolean;
  /** The person may start refunds, which go through at once within the resort's limit. */
  canInitiate?: boolean;
};

/** Asks for a refund. Returns it, approved and started when the person's role allows. */
export async function requestRefund(db: Database, input: RefundRequest) {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) throw new RuleError("Enter an amount above zero.");
  if (input.reason.trim().length < 3) throw new RuleError("Say why the money goes back.");
  const refund = await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, input.bookingId)).for("update");
    if (!booking) throw new NotFoundError("Booking");
    const [{ waiting }] = await tx
      .select({ waiting: sql<number>`coalesce(sum(${refunds.amountPaise}), 0)`.mapWith(Number) })
      .from(refunds)
      .where(and(eq(refunds.bookingId, booking.id), inArray(refunds.status, ["requested", "processing"])));
    const left = booking.paidPaise - waiting;
    if (input.amountPaise > left) throw new RuleError(`Only ${rupees(Math.max(0, left))} paid is left to refund.`);

    let onlinePaymentId: string | null = null;
    if (input.method === "razorpay") {
      const options = await refundablePayments(tx, booking.id);
      const payment = options.sort((a, b) => b.refundablePaise - a.refundablePaise)[0];
      if (!payment) throw new RuleError("Nothing was paid online. Refund by hand instead.");
      if (payment.refundablePaise < input.amountPaise) throw new RuleError(`At most ${rupees(payment.refundablePaise)} can go back to one online payment.`);
      onlinePaymentId = payment.id;
    }

    const [property] = await tx.select({ limit: properties.refundApprovalPaise }).from(properties).where(eq(properties.id, booking.propertyId));
    const approved = Boolean(input.canApprove || (input.canInitiate && property.limit !== null && input.amountPaise <= property.limit));
    const [row] = await tx
      .insert(refunds)
      .values({
        propertyId: booking.propertyId,
        bookingId: booking.id,
        onlinePaymentId,
        method: input.method === "razorpay" ? null : input.method,
        amountPaise: input.amountPaise,
        reason: input.reason.trim(),
        reference: input.reference?.trim() || null,
        status: approved ? "processing" : "requested",
        requestedBy: input.userId ?? null,
        decidedBy: approved ? (input.userId ?? null) : null,
        decidedAt: approved ? sql`now()` : null,
      })
      .returning();
    await tx.insert(bookingEvents).values({
      propertyId: booking.propertyId,
      bookingId: booking.id,
      type: "refund_requested",
      userId: input.userId ?? null,
      note: input.reason.trim(),
      data: { refundId: row.id, amountPaise: input.amountPaise, method: input.method, approved },
    });
    return row;
  });
  if (refund.status === "processing") await processRefund(db, refund.id);
  const [now] = await db.select().from(refunds).where(eq(refunds.id, refund.id));
  return now;
}

/** Approves or rejects a refund that waits. An approved one starts at once. */
export async function decideRefund(db: Database, input: { refundId: string; approve: boolean; userId?: string; note?: string }) {
  const refund = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(refunds).where(eq(refunds.id, input.refundId)).for("update");
    if (!row) throw new NotFoundError("Refund");
    if (row.status !== "requested") throw new RuleError("This refund was already decided.");
    const status = input.approve ? ("processing" as const) : ("rejected" as const);
    await tx.update(refunds).set({ status, decidedBy: input.userId ?? null, decidedAt: sql`now()` }).where(eq(refunds.id, row.id));
    await tx.insert(bookingEvents).values({
      propertyId: row.propertyId,
      bookingId: row.bookingId,
      type: input.approve ? "refund_approved" : "refund_rejected",
      userId: input.userId ?? null,
      note: input.note?.trim() || null,
      data: { refundId: row.id, amountPaise: row.amountPaise },
    });
    return { ...row, status };
  });
  if (refund.status === "processing") await processRefund(db, refund.id);
}

/**
 * Pays an approved refund: through Razorpay, or, for one paid by hand, by
 * marking it done. Razorpay may finish at once or later; a later answer
 * comes by webhook or the recheck.
 */
export async function processRefund(db: Database, refundId: string) {
  const [refund] = await db.select().from(refunds).where(eq(refunds.id, refundId));
  if (!refund || refund.status !== "processing") return;
  if (!refund.onlinePaymentId) {
    await db.transaction((tx) => settleRefund(tx, refund.id));
    return;
  }
  if (refund.providerRefundId) return;
  const [payment] = await db.select().from(onlinePayments).where(eq(onlinePayments.id, refund.onlinePaymentId));
  const account = await paymentAccount(db, refund.propertyId);
  if (!account || !payment?.paymentId) {
    await db.update(refunds).set({ status: "failed", error: "The resort's Razorpay account is not set up." }).where(eq(refunds.id, refund.id));
    return;
  }
  try {
    const sent = await razorpayFor(account).refund(payment.paymentId, { amount: refund.amountPaise, receipt: refund.id.slice(0, 40), notes: { reason: refund.reason.slice(0, 250) } });
    await db.update(refunds).set({ providerRefundId: sent.id, error: null }).where(eq(refunds.id, refund.id));
    if (sent.status === "processed") await db.transaction((tx) => settleRefund(tx, refund.id));
  } catch (error) {
    await db.update(refunds).set({ status: "failed", error: error instanceof Error ? error.message : String(error) }).where(eq(refunds.id, refund.id));
  }
}

/** A failed refund can be tried again. */
export async function retryRefund(db: Database, refundId: string) {
  await db.update(refunds).set({ status: "processing", providerRefundId: null, error: null }).where(and(eq(refunds.id, refundId), eq(refunds.status, "failed")));
  await processRefund(db, refundId);
}

/**
 * The money has gone back: the booking's paid amount drops, a credit note
 * reduces its invoice, and a cancelled booking with nothing left paid
 * becomes Refunded. Runs once per refund.
 */
export async function settleRefund(tx: Tx, refundId: string) {
  const [refund] = await tx.select().from(refunds).where(eq(refunds.id, refundId)).for("update");
  if (!refund || refund.status === "processed") return;
  await tx.update(refunds).set({ status: "processed", processedAt: sql`now()`, error: null }).where(eq(refunds.id, refund.id));
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, refund.bookingId)).for("update");
  const paid = Math.max(0, booking.paidPaise - refund.amountPaise);
  await tx.update(bookings).set({ paidPaise: paid, refundedPaise: booking.refundedPaise + refund.amountPaise }).where(eq(bookings.id, booking.id));
  await tx.insert(bookingEvents).values({
    propertyId: booking.propertyId,
    bookingId: booking.id,
    type: "refund",
    note: refund.reason,
    data: { refundId: refund.id, amountPaise: refund.amountPaise, method: refund.method ?? "razorpay", reference: refund.providerRefundId ?? refund.reference },
  });
  await alignInvoiceToKept(tx, booking.id, `Refund: ${refund.reason}`);
  if ((booking.status === "cancelled" || booking.status === "no_show") && paid === 0 && allowedMoves[booking.status].includes("refunded")) {
    await tx.update(bookings).set({ status: "refunded" }).where(eq(bookings.id, booking.id));
    await tx.insert(bookingEvents).values({ propertyId: booking.propertyId, bookingId: booking.id, type: "status", fromStatus: booking.status, toStatus: "refunded" });
  }
}
