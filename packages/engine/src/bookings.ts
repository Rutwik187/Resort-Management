import { and, eq, sql } from "drizzle-orm";
import {
  bookingCounters,
  bookingEvents,
  bookingItems,
  bookings,
  capacityDays,
  capacityHolds,
  guests,
  holds,
  inventoryLog,
  properties,
  unitNights,
  type Database,
} from "@repo/db";
import { nightsOf, todayInIndia } from "./dates";
import { NotFoundError, RuleError, SoldOutError, TransitionError, isUniqueViolation } from "./errors";
import { freeHoldStock, type Quote } from "./holds";
import { headcount } from "./pricing";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type BookingStatus = (typeof bookings.$inferSelect)["status"];
export type BookingSource = (typeof bookings.$inferSelect)["source"];

/**
 * The moves a booking may make (BK-04). Everything else is refused. Each
 * move writes a timeline entry.
 */
export const allowedMoves: Record<BookingStatus, readonly BookingStatus[]> = {
  pending_payment: ["confirmed", "part_paid", "expired", "cancelled"],
  part_paid: ["confirmed", "checked_in", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: ["refunded"],
  no_show: ["refunded"],
  refunded: [],
  expired: [],
};

/** A move that gives the rooms and seats back. */
const releasesStock = (status: BookingStatus) => status === "cancelled" || status === "expired";

/**
 * The next booking number for a resort, such as KS-26-000123 (BK-03). The
 * counter row is locked by the update, so two bookings never share a number.
 */
export async function nextBookingNumber(tx: Tx, propertyId: string, code: string, today = todayInIndia()) {
  const year = Number(today.slice(2, 4));
  const [row] = await tx
    .insert(bookingCounters)
    .values({ propertyId, year, next: 2 })
    .onConflictDoUpdate({ target: [bookingCounters.propertyId, bookingCounters.year], set: { next: sql`${bookingCounters.next} + 1` } })
    .returning({ next: bookingCounters.next });
  return `${code}-${String(year).padStart(2, "0")}-${String(row.next - 1).padStart(6, "0")}`;
}

export type GuestInput = { name: string; phone?: string; email?: string; companyName?: string; companyGstin?: string };

/** Digits only, with India's country code when the number has ten digits. */
export function normalisePhone(phone: string | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  return digits.length === 10 ? `91${digits}` : digits;
}

/**
 * Turns a hold into a booking for a guest, priced from the hold's saved
 * quote. It waits for payment unless `confirm` is set, as for a booking
 * taken and paid at the front desk.
 */
export async function createBooking(
  db: Database,
  input: { holdId: string; guest: GuestInput; source: BookingSource; notes?: string; userId?: string; confirm?: boolean; today?: string },
): Promise<{ bookingId: string; number: string }> {
  return db.transaction(async (tx) => {
    const [hold] = await tx.select().from(holds).where(eq(holds.id, input.holdId)).for("update");
    if (!hold) throw new NotFoundError("Hold");
    if (hold.status !== "active" || hold.bookingId) throw new RuleError("This hold has already been used or let go.");
    if (hold.expiresAt.getTime() <= Date.now()) throw new RuleError("The hold has run out. Please search again.");
    const quote = hold.quote as Quote | null;
    if (!quote || quote.lines.length === 0) throw new RuleError("The hold has nothing in it.");
    if (!input.guest.name.trim()) throw new RuleError("Add the guest's name.");

    const [property] = await tx.select({ code: properties.code }).from(properties).where(eq(properties.id, hold.propertyId));
    const number = await nextBookingNumber(tx, hold.propertyId, property.code, input.today);
    const [guest] = await tx
      .insert(guests)
      .values({
        name: input.guest.name.trim(),
        phone: normalisePhone(input.guest.phone),
        email: input.guest.email?.trim().toLowerCase() || null,
        companyName: input.guest.companyName?.trim() || null,
        companyGstin: input.guest.companyGstin?.trim().toUpperCase() || null,
      })
      .returning({ id: guests.id });

    const [booking] = await tx
      .insert(bookings)
      .values({
        propertyId: hold.propertyId,
        number,
        status: "pending_payment",
        source: input.source,
        guestId: guest.id,
        checkIn: quote.checkIn ?? null,
        checkOut: quote.checkOut ?? null,
        visitDate: quote.day ?? null,
        totalPaise: quote.totalPaise,
        quote,
        notes: input.notes ?? null,
        createdBy: input.userId ?? null,
      })
      .returning({ id: bookings.id });

    await tx.insert(bookingItems).values(
      quote.lines.map((line, i) =>
        line.kind === "stay"
          ? { propertyId: hold.propertyId, bookingId: booking.id, kind: "stay" as const, roomTypeId: line.roomTypeId, unitId: line.unitId, party: line.party, extraBeds: line.extraBeds, amountPaise: line.totalPaise, sortOrder: i }
          : { propertyId: hold.propertyId, bookingId: booking.id, kind: "offering" as const, offeringId: line.offeringId, slotId: line.slotId, party: line.party, amountPaise: line.totalPaise, sortOrder: i },
      ),
    );
    await tx.update(holds).set({ bookingId: booking.id }).where(eq(holds.id, hold.id));
    await tx.insert(bookingEvents).values({ propertyId: hold.propertyId, bookingId: booking.id, type: "created", toStatus: "pending_payment", userId: input.userId ?? null, data: { source: input.source } });

    if (input.confirm) await confirmInTx(tx, booking.id, input.userId);
    return { bookingId: booking.id, number };
  });
}

/**
 * Confirms a booking once it is paid: its held rooms and seats become
 * booked. If the hold ran out and its rooms were let go, the same rooms are
 * taken again when still free; if someone else has them, SoldOutError says
 * the payment must be refunded.
 */
export async function confirmBooking(db: Database, input: { bookingId: string; userId?: string }) {
  await db.transaction((tx) => confirmInTx(tx, input.bookingId, input.userId));
}

async function confirmInTx(tx: Tx, bookingId: string, userId?: string) {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for("update");
  if (!booking) throw new NotFoundError("Booking");
  if (booking.status === "confirmed") return;
  if (!allowedMoves[booking.status].includes("confirmed")) throw new TransitionError(booking.status, "confirmed");
  const [hold] = await tx.select().from(holds).where(eq(holds.bookingId, bookingId)).for("update");
  const quote = booking.quote as Quote;

  // Rooms: the hold's rows become the booking's. Any let go since are taken again, if still free.
  const moved = hold
    ? await tx.update(unitNights).set({ bookingId, holdId: null }).where(eq(unitNights.holdId, hold.id)).returning({ unitId: unitNights.unitId, night: unitNights.night })
    : [];
  for (const line of quote.lines) {
    if (line.kind !== "stay") continue;
    const nights = nightsOf(quote.checkIn!, quote.checkOut!);
    const missing = nights.filter((night) => !moved.some((row) => row.unitId === line.unitId && row.night === night));
    if (missing.length) {
      try {
        await tx.transaction(async (sp) => {
          await sp.insert(unitNights).values(missing.map((night) => ({ propertyId: booking.propertyId, unitId: line.unitId, night, bookingId })));
        });
      } catch (error) {
        if (isUniqueViolation(error)) throw new SoldOutError(`${line.unitName} was taken after the hold ran out. Refund the payment.`);
        throw error;
      }
    }
    await tx.insert(inventoryLog).values({ propertyId: booking.propertyId, action: "book", unitId: line.unitId, fromDate: nights[0], toDate: nights[nights.length - 1], bookingId, userId: userId ?? null });
  }

  // Seats: held becomes sold. Seats let go since are sold again, if the day still has room.
  const held = hold ? await tx.delete(capacityHolds).where(eq(capacityHolds.holdId, hold.id)).returning() : [];
  for (const line of quote.lines) {
    if (line.kind !== "offering") continue;
    const guests = headcount(line.party);
    const stillHeld = held.find((h) => h.slotId === line.slotId && h.day === line.day);
    const from = stillHeld ? Math.min(stillHeld.guests, guests) : 0;
    if (stillHeld) stillHeld.guests -= from;
    const updated = await tx
      .update(capacityDays)
      .set({ held: sql`${capacityDays.held} - ${from}`, sold: sql`${capacityDays.sold} + ${guests}` })
      .where(and(eq(capacityDays.slotId, line.slotId), eq(capacityDays.day, line.day), sql`${capacityDays.sold} + ${capacityDays.held} + ${guests - from} <= ${capacityDays.capacity}`))
      .returning({ sold: capacityDays.sold });
    if (updated.length === 0) throw new SoldOutError(`${line.offeringName} filled up after the hold ran out. Refund the payment.`);
    await tx.insert(inventoryLog).values({ propertyId: booking.propertyId, action: "book", slotId: line.slotId, fromDate: line.day, toDate: line.day, bookingId, userId: userId ?? null, data: { guests } });
  }

  if (hold) await tx.update(holds).set({ status: "converted" }).where(eq(holds.id, hold.id));
  await tx.update(bookings).set({ status: "confirmed" }).where(eq(bookings.id, bookingId));
  await tx.insert(bookingEvents).values({ propertyId: booking.propertyId, bookingId, type: "status", fromStatus: booking.status, toStatus: "confirmed", userId: userId ?? null });
}

/**
 * Moves a booking to a new status (BK-04), if allowed. Cancelling or
 * expiring gives its rooms and seats back. Confirming goes through
 * confirmBooking, which also books the stock.
 */
export async function changeBookingStatus(db: Database, input: { bookingId: string; to: BookingStatus; userId?: string; note?: string }) {
  if (input.to === "confirmed") return confirmBooking(db, input);
  await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, input.bookingId)).for("update");
    if (!booking) throw new NotFoundError("Booking");
    if (!allowedMoves[booking.status].includes(input.to)) throw new TransitionError(booking.status, input.to);

    if (releasesStock(input.to)) {
      const [hold] = await tx.select().from(holds).where(eq(holds.bookingId, booking.id)).for("update");
      if (hold?.status === "active") {
        await freeHoldStock(tx, hold.id);
        await tx.update(holds).set({ status: input.to === "expired" ? "expired" : "released" }).where(eq(holds.id, hold.id));
      }
      await releaseBookedStock(tx, booking.id, booking.propertyId, input.userId);
    }

    await tx.update(bookings).set({ status: input.to }).where(eq(bookings.id, booking.id));
    await tx.insert(bookingEvents).values({ propertyId: booking.propertyId, bookingId: booking.id, type: "status", fromStatus: booking.status, toStatus: input.to, userId: input.userId ?? null, note: input.note ?? null });
  });
}

/** Gives back the rooms and seats a booking holds as booked. */
async function releaseBookedStock(tx: Tx, bookingId: string, propertyId: string, userId?: string) {
  const rooms = await tx.delete(unitNights).where(eq(unitNights.bookingId, bookingId)).returning({ unitId: unitNights.unitId, night: unitNights.night });
  for (const unitId of new Set(rooms.map((r) => r.unitId))) {
    const own = rooms.filter((r) => r.unitId === unitId).map((r) => r.night).sort();
    await tx.insert(inventoryLog).values({ propertyId, action: "cancel", unitId, fromDate: own[0], toDate: own[own.length - 1], bookingId, userId: userId ?? null });
  }
  const [booking] = await tx.select({ quote: bookings.quote, status: bookings.status }).from(bookings).where(eq(bookings.id, bookingId));
  if (booking.status === "pending_payment") return;
  for (const line of (booking.quote as Quote).lines) {
    if (line.kind !== "offering") continue;
    const guests = headcount(line.party);
    await tx
      .update(capacityDays)
      .set({ sold: sql`greatest(${capacityDays.sold} - ${guests}, 0)` })
      .where(and(eq(capacityDays.slotId, line.slotId), eq(capacityDays.day, line.day)));
    await tx.insert(inventoryLog).values({ propertyId, action: "cancel", slotId: line.slotId, fromDate: line.day, toDate: line.day, bookingId, userId: userId ?? null, data: { guests } });
  }
}
