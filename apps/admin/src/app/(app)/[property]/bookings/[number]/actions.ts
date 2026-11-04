"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { bookingItems, bookings, getDb, offlinePayments } from "@repo/db";
import { addBookingNote, assignUnit, changeBookingStatus, NotFoundError, recordPayment, setBookingPrice } from "@repo/engine";
import { rupees, statusLabel } from "@/lib/format";
import { filled, problem, rupeesField, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";

// Bound values come from the browser, so each is checked before use.
const id = z.uuid({ error: "That booking no longer exists." });

/** The booking as it is now, to check the person's role at its resort. */
async function bookingOf(bookingId: string) {
  id.parse(bookingId);
  const [booking] = await getDb()
    .select({ id: bookings.id, propertyId: bookings.propertyId, status: bookings.status, totalPaise: bookings.totalPaise })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (!booking) throw new NotFoundError("Booking");
  return booking;
}

const frontDesk = { checked_in: "booking.check_in", checked_out: "booking.check_out", no_show: "booking.no_show" } as const;

/** Checks a guest in or out, or marks a no-show (ADM-05). */
export async function moveBooking(bookingId: string, to: keyof typeof frontDesk): Promise<FormState> {
  try {
    z.enum(["checked_in", "checked_out", "no_show"]).parse(to);
    const booking = await bookingOf(bookingId);
    const staff = await requirePermission("bookings.modify", booking.propertyId);
    await changeBookingStatus(getDb(), { bookingId, to, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: booking.propertyId, action: frontDesk[to], entity: "bookings", entityId: bookingId, before: { status: booking.status }, after: { status: to } });
    refresh();
    return { done: `${statusLabel[to]}.` };
  } catch (error) {
    return problem(error, "Your role can't change bookings at this resort.");
  }
}

const reasonInput = z.object({ reason: z.string().trim().min(3, "Say why, in a few words.").max(500) });

/** Cancels a booking with a reason. Its rooms and seats go back on sale (ADM-05). */
export async function cancelBooking(bookingId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const booking = await bookingOf(bookingId);
    const staff = await requirePermission("bookings.cancel", booking.propertyId);
    const { reason } = reasonInput.parse(filled(form));
    await changeBookingStatus(getDb(), { bookingId, to: "cancelled", userId: staff.userId, note: reason });
    await audit({ userId: staff.userId, propertyId: booking.propertyId, action: "booking.cancel", entity: "bookings", entityId: bookingId, before: { status: booking.status }, after: { status: "cancelled", reason } });
    refresh();
    return { done: "Cancelled. The rooms are back on sale." };
  } catch (error) {
    return problem(error, "Your role can't cancel bookings at this resort.");
  }
}

const paymentInput = z.object({
  method: z.enum(["cash", "upi", "card", "bank_transfer", "cheque", "other"], { error: "Choose how the guest paid." }),
  amount: rupeesField("Amount"),
  reference: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

/** Records a cash, UPI, card or bank payment taken for the booking. */
export async function takePayment(bookingId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const booking = await bookingOf(bookingId);
    const staff = await requirePermission("bookings.modify", booking.propertyId);
    const input = paymentInput.parse(filled(form));
    const { paymentId } = await recordPayment(getDb(), { bookingId, amountPaise: input.amount, method: input.method, reference: input.reference, note: input.note, userId: staff.userId });
    const [payment] = await getDb().select().from(offlinePayments).where(eq(offlinePayments.id, paymentId));
    await audit({ userId: staff.userId, propertyId: booking.propertyId, action: "payment.record", entity: "offline_payments", entityId: paymentId, after: payment });
    refresh();
    return { done: `${rupees(input.amount)} recorded.` };
  } catch (error) {
    return problem(error, "Your role can't take payments at this resort.");
  }
}

const priceInput = z.object({ amount: rupeesField("Price"), reason: z.string().trim().min(3, "Say why the price is different.").max(500) });

/** Sets the booking's price by hand, with a reason (ADM-07). */
export async function changePrice(bookingId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const booking = await bookingOf(bookingId);
    const staff = await requirePermission("prices.manage", booking.propertyId);
    const { amount, reason } = priceInput.parse(filled(form));
    await setBookingPrice(getDb(), { bookingId, totalPaise: amount, reason, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: booking.propertyId, action: "booking.price", entity: "bookings", entityId: bookingId, before: { totalPaise: booking.totalPaise }, after: { totalPaise: amount, reason } });
    refresh();
    return { done: `The price is now ${rupees(amount)}.` };
  } catch (error) {
    return problem(error, "Only roles that manage prices can set a price.");
  }
}

/** Gives a stay another room of the same type (RM-04). */
export async function changeRoom(bookingItemId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(bookingItemId);
    const [item] = await getDb().select({ bookingId: bookingItems.bookingId, propertyId: bookingItems.propertyId, unitId: bookingItems.unitId }).from(bookingItems).where(eq(bookingItems.id, bookingItemId));
    if (!item) throw new NotFoundError("Room in the booking");
    const staff = await requirePermission("bookings.modify", item.propertyId);
    const unitId = z.uuid({ error: "Choose a room." }).parse(form.get("unitId"));
    await assignUnit(getDb(), { bookingItemId, unitId, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: item.propertyId, action: "booking.unit", entity: "booking_items", entityId: bookingItemId, before: { unitId: item.unitId }, after: { unitId } });
    refresh();
    return { done: "Room changed." };
  } catch (error) {
    return problem(error, "Your role can't change bookings at this resort.");
  }
}

/** Adds an internal note to the booking's timeline. */
export async function noteBooking(bookingId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const booking = await bookingOf(bookingId);
    const staff = await requirePermission("bookings.modify", booking.propertyId);
    const note = z.string().max(2000, "Keep the note under 2,000 characters.").parse(form.get("note") ?? "");
    await addBookingNote(getDb(), { bookingId, note, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: booking.propertyId, action: "booking.note", entity: "bookings", entityId: bookingId, after: { note: note.trim() } });
    refresh();
    return { done: "Note added." };
  } catch (error) {
    return problem(error, "Your role can't add notes at this resort.");
  }
}
