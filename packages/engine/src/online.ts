import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { bookingEvents, bookings, guests, onlinePayments, paymentAccounts, properties, refunds, webhookEvents, type Database } from "@repo/db";
import { markPaid, type Tx } from "./bookings";
import { NotFoundError, RuleError, SoldOutError } from "./errors";
import { razorpay, razorpaySender, type Razorpay, type RazorpayKeys, type RazorpayPayment } from "./razorpay";
import { processRefund, settleRefund } from "./refunds";
import { decryptSecret, encryptSecret, signatureMatches } from "./secrets";

/*
 * Online payments through Razorpay (docs/implementation-plan.md, section 6).
 * Each company has its own account. Only the server confirms a booking: after
 * it checks the checkout's signature, or when a signed webhook arrives,
 * whichever comes first; the other then finds the payment done and changes
 * nothing. The amount charged comes from the booking, never the browser.
 */

export type PaymentAccount = RazorpayKeys & { mode: "test" | "live"; webhookSecret: string | null; source: "admin" | "env" };

const modeOf = (keyId: string): "test" | "live" => (keyId.startsWith("rzp_live_") ? "live" : "test");

/**
 * A resort's Razorpay account: its own, saved in the admin, or else the
 * shared account in RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET. Null when it
 * has neither, and the website then takes requests on WhatsApp.
 */
export async function paymentAccount(db: Database | Tx, propertyId: string): Promise<PaymentAccount | null> {
  const [row] = await db.select().from(paymentAccounts).where(eq(paymentAccounts.propertyId, propertyId));
  if (row?.active) {
    return { keyId: row.keyId, keySecret: decryptSecret(row.keySecret), webhookSecret: row.webhookSecret ? decryptSecret(row.webhookSecret) : null, mode: row.mode, source: "admin" };
  }
  if (row && !row.active) return null;
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null, mode: modeOf(keyId), source: "env" };
}

/** Saves a resort's Razorpay keys, encrypted. A blank secret keeps the saved one. */
export async function savePaymentAccount(
  db: Database,
  input: { propertyId: string; keyId: string; keySecret?: string; webhookSecret?: string; active: boolean; userId?: string },
) {
  const keyId = input.keyId.trim();
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) throw new RuleError("The key id starts with rzp_test_ or rzp_live_.");
  const [existing] = await db.select().from(paymentAccounts).where(eq(paymentAccounts.propertyId, input.propertyId));
  const keySecret = input.keySecret?.trim() ? encryptSecret(input.keySecret.trim()) : existing?.keySecret;
  if (!keySecret) throw new RuleError("Enter the key secret.");
  const webhookSecret = input.webhookSecret?.trim() ? encryptSecret(input.webhookSecret.trim()) : (existing?.webhookSecret ?? null);
  const values = { keyId, keySecret, webhookSecret, active: input.active, mode: modeOf(keyId), updatedBy: input.userId ?? null };
  await db
    .insert(paymentAccounts)
    .values({ propertyId: input.propertyId, ...values })
    .onConflictDoUpdate({ target: paymentAccounts.propertyId, set: values });
}

/** How the engine reaches Razorpay. Tests replace it. */
let clientFor: (keys: RazorpayKeys) => Razorpay = (keys) => razorpay(razorpaySender(keys));
export function setRazorpayClient(make: (keys: RazorpayKeys) => Razorpay) {
  clientFor = make;
}
export const razorpayFor = (keys: RazorpayKeys) => clientFor(keys);

async function accountOrThrow(db: Database | Tx, propertyId: string) {
  const account = await paymentAccount(db, propertyId);
  if (!account) throw new RuleError("This resort doesn't take payments online yet. Add its Razorpay keys in Settings.");
  return account;
}

/**
 * Starts a checkout on the website: a Razorpay order for the amount due
 * now, on the resort's own account. Returns what the checkout needs.
 */
export async function startCheckout(db: Database, input: { bookingId: string; amountPaise: number }) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId));
  if (!booking) throw new NotFoundError("Booking");
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) throw new RuleError("The amount must be at least ₹1.");
  const account = await accountOrThrow(db, booking.propertyId);
  const order = await razorpayFor(account).createOrder({ amount: input.amountPaise, receipt: booking.number, notes: { booking: booking.number } });
  const [row] = await db
    .insert(onlinePayments)
    .values({ propertyId: booking.propertyId, bookingId: booking.id, via: "checkout", mode: account.mode, orderId: order.id, amountPaise: input.amountPaise })
    .returning({ id: onlinePayments.id });
  return { onlinePaymentId: row.id, orderId: order.id, keyId: account.keyId, amountPaise: input.amountPaise, mode: account.mode };
}

/**
 * The checkout's answer from the guest's browser. Its signature proves
 * Razorpay sent it. A payment only authorised is captured, then applied.
 */
export async function completeCheckout(db: Database, input: { orderId: string; paymentId: string; signature: string }) {
  const [row] = await db.select().from(onlinePayments).where(eq(onlinePayments.orderId, input.orderId));
  if (!row) throw new NotFoundError("Payment");
  const account = await accountOrThrow(db, row.propertyId);
  if (!signatureMatches(`${input.orderId}|${input.paymentId}`, account.keySecret, input.signature)) throw new RuleError("The payment couldn't be verified.");
  const client = razorpayFor(account);
  let payment = await client.payment(input.paymentId);
  if (payment.order_id !== input.orderId) throw new RuleError("The payment couldn't be verified.");
  if (payment.status === "authorized") payment = await client.capture(payment.id, payment.amount);
  if (payment.status !== "captured") throw new RuleError(payment.error_description ?? "The payment didn't go through.");
  return applyOnlinePayment(db, row.id, payment);
}

/**
 * Applies a captured payment to its booking, once. A booking waiting for
 * payment becomes part paid or confirmed and its rooms are booked. If its
 * hold ran out, it gets the same rooms back when they're still free; if
 * not, or if it was cancelled, the money is refunded at once.
 */
export async function applyOnlinePayment(db: Database, onlinePaymentId: string, payment: Pick<RazorpayPayment, "id" | "amount" | "method">) {
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(onlinePayments).where(eq(onlinePayments.id, onlinePaymentId)).for("update");
    if (!row) throw new NotFoundError("Payment");
    if (row.status === "paid") return { bookingId: row.bookingId, already: true, refundId: null as string | null };
    await tx
      .update(onlinePayments)
      .set({ status: "paid", paymentId: payment.id, method: payment.method, amountPaise: payment.amount, paidAt: sql`now()`, error: null })
      .where(eq(onlinePayments.id, row.id));
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, row.bookingId)).for("update");
    const paid = booking.paidPaise + payment.amount;
    await tx.update(bookings).set({ paidPaise: paid }).where(eq(bookings.id, booking.id));
    await tx.insert(bookingEvents).values({
      propertyId: booking.propertyId,
      bookingId: booking.id,
      type: "payment",
      data: { onlinePaymentId: row.id, method: `razorpay${payment.method ? `_${payment.method}` : ""}`, amountPaise: payment.amount, reference: payment.id, via: row.via },
    });

    const fullyPaid = booking.totalPaise !== null && paid >= booking.totalPaise;
    const to = fullyPaid ? "confirmed" : "part_paid";
    let refundReason: string | null = null;
    if (booking.status === "pending_payment" || booking.status === "expired") {
      try {
        await tx.transaction(async (sp) => {
          if (booking.status === "expired") {
            // Paid after the hold ran out: take the rooms again, if nobody else has.
            await sp.update(bookings).set({ status: "pending_payment" }).where(eq(bookings.id, booking.id));
            await sp.insert(bookingEvents).values({ propertyId: booking.propertyId, bookingId: booking.id, type: "status", fromStatus: "expired", toStatus: "pending_payment", note: "Paid after the hold ran out." });
          }
          await markPaid(sp, booking.id, to, undefined, "Paid online.");
        });
      } catch (error) {
        if (!(error instanceof SoldOutError)) throw error;
        refundReason = `Paid after the hold ran out, and ${error.message.replace(/ Refund the payment\.$/, "").replace(/^./, (c) => c.toLowerCase())}`;
      }
    } else if (booking.status === "part_paid" && fullyPaid) {
      await markPaid(tx, booking.id, "confirmed", undefined, "Balance paid online.");
    } else if (["cancelled", "no_show", "refunded"].includes(booking.status)) {
      refundReason = "Paid after the booking was cancelled.";
    }

    if (!refundReason) return { bookingId: booking.id, already: false, refundId: null as string | null };
    await tx.insert(bookingEvents).values({ propertyId: booking.propertyId, bookingId: booking.id, type: "note", note: `${refundReason} The payment is being refunded.` });
    const [refund] = await tx
      .insert(refunds)
      .values({ propertyId: booking.propertyId, bookingId: booking.id, onlinePaymentId: row.id, amountPaise: payment.amount, reason: refundReason, status: "processing", decidedAt: sql`now()` })
      .returning({ id: refunds.id });
    return { bookingId: booking.id, already: false, refundId: refund.id };
  });
  if (result.refundId) await processRefund(db, result.refundId).catch((error) => console.error("The automatic refund didn't start; the recheck will try again.", error));
  return result;
}

/**
 * A payment link for a balance or a price difference, sent by Razorpay to
 * the guest's phone and email. It lasts seven days.
 */
export async function createPaymentLink(db: Database, input: { bookingId: string; amountPaise?: number; userId?: string }) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId));
  if (!booking) throw new NotFoundError("Booking");
  if (!["pending_payment", "part_paid", "confirmed", "checked_in", "checked_out"].includes(booking.status)) throw new RuleError("This booking can't take a payment.");
  const balance = booking.totalPaise === null ? null : booking.totalPaise - booking.paidPaise;
  const amount = input.amountPaise ?? balance;
  if (!amount || amount < 100) throw new RuleError("There is nothing to collect. Enter an amount of at least ₹1.");
  if (balance !== null && amount > balance) throw new RuleError("That is more than the balance.");
  const [guest] = await db.select().from(guests).where(eq(guests.id, booking.guestId));
  const [property] = await db.select({ name: properties.name }).from(properties).where(eq(properties.id, booking.propertyId));
  const account = await accountOrThrow(db, booking.propertyId);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(onlinePayments).where(and(eq(onlinePayments.bookingId, booking.id), eq(onlinePayments.via, "link")));
  const link = await razorpayFor(account).createLink({
    amount,
    description: `${property.name}, booking ${booking.number}`,
    reference: `${booking.number}-L${n + 1}`,
    customer: { name: guest.name, contact: guest.phone ? `+${guest.phone}` : undefined, email: guest.email ?? undefined },
    expireBy: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    notes: { booking: booking.number },
  });
  const [row] = await db
    .insert(onlinePayments)
    .values({ propertyId: booking.propertyId, bookingId: booking.id, via: "link", mode: account.mode, linkId: link.id, linkUrl: link.short_url, amountPaise: amount, createdBy: input.userId ?? null })
    .returning();
  await db.insert(bookingEvents).values({ propertyId: booking.propertyId, bookingId: booking.id, type: "payment_link", userId: input.userId ?? null, data: { amountPaise: amount, url: link.short_url } });
  return row;
}

/** Cancels nothing at Razorpay; just stops showing a link as waiting. */
export async function dropPaymentLink(db: Database, onlinePaymentId: string) {
  await db.update(onlinePayments).set({ status: "cancelled" }).where(and(eq(onlinePayments.id, onlinePaymentId), eq(onlinePayments.status, "created")));
}

type WebhookBody = {
  event: string;
  payload: {
    payment?: { entity: RazorpayPayment };
    order?: { entity: { id: string } };
    payment_link?: { entity: { id: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
  };
};

/**
 * A Razorpay webhook for one resort (section 6: webhooks). The signature is
 * checked with the account's webhook secret, and each event is saved once,
 * by its id: a repeat finds its row and does nothing.
 */
export async function handleRazorpayWebhook(db: Database, input: { propertyCode: string; body: string; signature: string | null; eventId: string | null }) {
  const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.code, input.propertyCode));
  if (!property) throw new NotFoundError("Resort");
  const account = await paymentAccount(db, property.id);
  if (!account?.webhookSecret) throw new RuleError("No webhook secret is set for this resort.");
  if (!signatureMatches(input.body, account.webhookSecret, input.signature)) throw new RuleError("The webhook's signature doesn't match.");
  const body = JSON.parse(input.body) as WebhookBody;
  const eventId = input.eventId ?? `${body.event}:${body.payload.payment?.entity.id ?? body.payload.refund?.entity.id ?? body.payload.payment_link?.entity.id ?? ""}`;
  const [event] = await db
    .insert(webhookEvents)
    .values({ propertyId: property.id, provider: "razorpay", eventId, type: body.event, payload: body })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (!event) return { duplicate: true };

  try {
    const payment = body.payload.payment?.entity;
    if ((body.event === "payment.captured" || body.event === "order.paid") && payment?.order_id) {
      const [row] = await db.select().from(onlinePayments).where(eq(onlinePayments.orderId, payment.order_id));
      if (row && payment.status === "captured") await applyOnlinePayment(db, row.id, payment);
    } else if (body.event === "payment_link.paid" && body.payload.payment_link && payment) {
      const [row] = await db.select().from(onlinePayments).where(eq(onlinePayments.linkId, body.payload.payment_link.entity.id));
      if (row) await applyOnlinePayment(db, row.id, payment);
    } else if (body.event === "payment.failed" && payment?.order_id) {
      // The guest can try again on the same order; keep the reason for staff.
      await db.update(onlinePayments).set({ error: payment.error_description ?? "Payment failed." }).where(and(eq(onlinePayments.orderId, payment.order_id), eq(onlinePayments.status, "created")));
    } else if ((body.event === "refund.processed" || body.event === "refund.failed") && body.payload.refund) {
      const entity = body.payload.refund.entity;
      const [refund] = await db.select().from(refunds).where(eq(refunds.providerRefundId, entity.id));
      if (refund && body.event === "refund.processed") await db.transaction((tx) => settleRefund(tx, refund.id));
      if (refund && body.event === "refund.failed") await db.update(refunds).set({ status: "failed", error: "Razorpay couldn't complete the refund." }).where(eq(refunds.id, refund.id));
    }
    await db.update(webhookEvents).set({ processedAt: sql`now()` }).where(eq(webhookEvents.id, event.id));
  } catch (error) {
    await db.update(webhookEvents).set({ error: error instanceof Error ? error.message : String(error) }).where(eq(webhookEvents.id, event.id));
    throw error;
  }
  return { duplicate: false };
}

/**
 * Rechecks payments still waiting (section 6: pending orders), for the day
 * and night batches. A payment the guest made but whose answer never came
 * back is applied; orders left unpaid for two days are closed. Refunds in
 * progress are checked too. Safe to run twice.
 */
export async function recheckOnlinePayments(db: Database, limit = 50) {
  const waiting = await db
    .select()
    .from(onlinePayments)
    .where(and(eq(onlinePayments.status, "created"), gte(onlinePayments.createdAt, sql`now() - interval '8 days'`)))
    .orderBy(desc(onlinePayments.createdAt))
    .limit(limit);
  let applied = 0;
  for (const row of waiting) {
    try {
      const account = await paymentAccount(db, row.propertyId);
      if (!account) continue;
      const client = razorpayFor(account);
      if (row.via === "checkout" && row.orderId) {
        const payments = await client.orderPayments(row.orderId);
        let paid = payments.find((p) => p.status === "captured");
        const authorised = payments.find((p) => p.status === "authorized");
        if (!paid && authorised) paid = await client.capture(authorised.id, authorised.amount);
        if (paid?.status === "captured") {
          await applyOnlinePayment(db, row.id, paid);
          applied++;
        } else if (Date.now() - row.createdAt.getTime() > 2 * 24 * 3600 * 1000) {
          await db.update(onlinePayments).set({ status: "expired" }).where(and(eq(onlinePayments.id, row.id), eq(onlinePayments.status, "created")));
        }
      } else if (row.via === "link" && row.linkId) {
        const link = await client.link(row.linkId);
        const paid = link.payments?.find((p) => p.status === "captured");
        if (link.status === "paid" && paid) {
          await applyOnlinePayment(db, row.id, { id: paid.payment_id, amount: paid.amount, method: paid.method ?? null });
          applied++;
        } else if (link.status === "expired" || link.status === "cancelled") {
          await db.update(onlinePayments).set({ status: link.status }).where(and(eq(onlinePayments.id, row.id), eq(onlinePayments.status, "created")));
        }
      }
    } catch (error) {
      console.error(`Rechecking payment ${row.id} failed.`, error);
    }
  }

  // Refunds sent to Razorpay and not yet processed, and ones that never reached it.
  const pending = await db.select().from(refunds).where(and(eq(refunds.status, "processing"))).limit(limit);
  for (const refund of pending) {
    try {
      if (!refund.providerRefundId) {
        await processRefund(db, refund.id);
        continue;
      }
      const [payment] = await db.select().from(onlinePayments).where(eq(onlinePayments.id, refund.onlinePaymentId!));
      const account = await paymentAccount(db, refund.propertyId);
      if (!account || !payment?.paymentId) continue;
      const status = await razorpayFor(account).refundStatus(payment.paymentId, refund.providerRefundId);
      if (status.status === "processed") await db.transaction((tx) => settleRefund(tx, refund.id));
      if (status.status === "failed") await db.update(refunds).set({ status: "failed", error: "Razorpay couldn't complete the refund." }).where(eq(refunds.id, refund.id));
    } catch (error) {
      console.error(`Rechecking refund ${refund.id} failed.`, error);
    }
  }
  return { checked: waiting.length, applied };
}

/** A booking's online payments, newest first, for the admin and the guest's page. */
export async function onlinePaymentsOf(db: Database, bookingIds: string[]) {
  if (bookingIds.length === 0) return [];
  return db.select().from(onlinePayments).where(inArray(onlinePayments.bookingId, bookingIds)).orderBy(desc(onlinePayments.createdAt));
}
