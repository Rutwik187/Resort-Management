import { eq } from "drizzle-orm";
import { bookingEvents, bookings, offlinePayments, type Database } from "@repo/db";
import { markPaid, type BookingStatus, type Tx } from "./bookings";
import { NotFoundError, RuleError } from "./errors";

export type PaymentMethod = (typeof offlinePayments.$inferSelect)["method"];

export type PaymentInput = { bookingId: string; amountPaise: number; method: PaymentMethod; reference?: string; note?: string; userId?: string };

/** Bookings that can still take money. A cancelled or refunded one gets a refund instead. */
const takesPayments: readonly BookingStatus[] = ["pending_payment", "part_paid", "confirmed", "checked_in", "checked_out"];

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

/**
 * Records money taken at the resort or paid straight to the company's bank
 * (docs/implementation-plan.md, section 6). The booking's paid amount goes
 * up. A booking waiting for payment becomes part paid, or confirmed when
 * nothing is left to pay; either way its rooms and seats are booked. More
 * than the balance is refused.
 */
export async function recordPayment(db: Database, input: PaymentInput) {
  return db.transaction((tx) => recordPaymentInTx(tx, input));
}

export async function recordPaymentInTx(tx: Tx, input: PaymentInput) {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) throw new RuleError("Enter an amount above zero.");
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, input.bookingId)).for("update");
  if (!booking) throw new NotFoundError("Booking");
  if (!takesPayments.includes(booking.status)) throw new RuleError(`A booking that is ${booking.status.replace(/_/g, " ")} can't take a payment.`);
  const paid = booking.paidPaise + input.amountPaise;
  if (booking.totalPaise !== null && paid > booking.totalPaise) {
    throw new RuleError(`That is more than the balance of ${rupees(booking.totalPaise - booking.paidPaise)}.`);
  }

  const [payment] = await tx
    .insert(offlinePayments)
    .values({
      propertyId: booking.propertyId,
      bookingId: booking.id,
      method: input.method,
      amountPaise: input.amountPaise,
      reference: input.reference?.trim() || null,
      note: input.note?.trim() || null,
      createdBy: input.userId ?? null,
    })
    .returning({ id: offlinePayments.id });
  await tx.update(bookings).set({ paidPaise: paid }).where(eq(bookings.id, booking.id));
  await tx.insert(bookingEvents).values({
    propertyId: booking.propertyId,
    bookingId: booking.id,
    type: "payment",
    userId: input.userId ?? null,
    note: input.note?.trim() || null,
    data: { paymentId: payment.id, method: input.method, amountPaise: input.amountPaise, reference: input.reference?.trim() || null },
  });

  // Money in moves an unpaid booking on. With the price still to confirm, it can only be part paid.
  const fullyPaid = booking.totalPaise !== null && paid >= booking.totalPaise;
  if (booking.status === "pending_payment") await markPaid(tx, booking.id, fullyPaid ? "confirmed" : "part_paid", input.userId);
  else if (booking.status === "part_paid" && fullyPaid) await markPaid(tx, booking.id, "confirmed", input.userId);
  return { paymentId: payment.id, paidPaise: paid };
}
