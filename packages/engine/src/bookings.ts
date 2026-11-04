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
  units,
  type Database,
} from "@repo/db";
import { nightsOf, todayInIndia } from "./dates";
import { NotFoundError, RuleError, SoldOutError, TransitionError, isUniqueViolation } from "./errors";
import { freeHoldStock, type Quote } from "./holds";
import { recordPaymentInTx, type PaymentInput } from "./payments";
import { headcount } from "./pricing";

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
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

/** A price staff set instead of the engine's, with the reason (ADM-07). */
export type PriceOverride = { totalPaise: number; reason: string };

/**
 * Turns a hold into a booking for a guest, priced from the hold's saved
 * quote. It waits for payment unless `confirm` is set, or a `payment` taken
 * at the desk comes with it. Staff may set the price instead (ADM-07); the
 * quote is kept as the engine made it.
 */
export async function createBooking(
  db: Database,
  input: {
    holdId: string;
    guest: GuestInput;
    source: BookingSource;
    notes?: string;
    userId?: string;
    confirm?: boolean;
    payment?: Omit<PaymentInput, "bookingId" | "userId">;
    priceOverride?: PriceOverride;
    today?: string;
  },
): Promise<{ bookingId: string; number: string }> {
  if (input.priceOverride) checkOverride(input.priceOverride);
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
        totalPaise: input.priceOverride?.totalPaise ?? quote.totalPaise,
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
    if (input.priceOverride) {
      await tx.insert(bookingEvents).values({
        propertyId: hold.propertyId,
        bookingId: booking.id,
        type: "price_override",
        userId: input.userId ?? null,
        note: input.priceOverride.reason.trim(),
        data: { fromPaise: quote.totalPaise, toPaise: input.priceOverride.totalPaise },
      });
    }

    if (input.confirm) await markPaid(tx, booking.id, "confirmed", input.userId);
    if (input.payment) await recordPaymentInTx(tx, { ...input.payment, bookingId: booking.id, userId: input.userId });
    return { bookingId: booking.id, number };
  });
}

function checkOverride(override: PriceOverride) {
  if (!Number.isInteger(override.totalPaise) || override.totalPaise < 0) throw new RuleError("Enter a price of zero or more.");
  if (!override.reason.trim()) throw new RuleError("Say why the price is different.");
}

/**
 * Sets a booking's price by hand (ADM-07): for a rate still to be confirmed,
 * or a price agreed with the guest. It can't go below what is already paid.
 * A part-paid booking that is then fully paid becomes confirmed.
 */
export async function setBookingPrice(db: Database, input: PriceOverride & { bookingId: string; userId?: string }) {
  checkOverride(input);
  await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, input.bookingId)).for("update");
    if (!booking) throw new NotFoundError("Booking");
    if (!["pending_payment", "part_paid", "confirmed", "checked_in"].includes(booking.status)) throw new RuleError(`A booking that is ${words(booking.status)} keeps its price.`);
    if (input.totalPaise < booking.paidPaise) throw new RuleError("The price can't be less than what the guest has paid. Refund the difference first.");
    await tx.update(bookings).set({ totalPaise: input.totalPaise }).where(eq(bookings.id, booking.id));
    await tx.insert(bookingEvents).values({
      propertyId: booking.propertyId,
      bookingId: booking.id,
      type: "price_override",
      userId: input.userId ?? null,
      note: input.reason.trim(),
      data: { fromPaise: booking.totalPaise, toPaise: input.totalPaise },
    });
    if (booking.status === "part_paid" && booking.paidPaise >= input.totalPaise) await markPaid(tx, booking.id, "confirmed", input.userId);
  });
}

const words = (status: string) => status.replace(/_/g, " ");

/**
 * Confirms a booking once it is paid. If its hold ran out and its rooms were
 * let go, the same rooms are taken again when still free; if someone else
 * has them, SoldOutError says the payment must be refunded.
 */
export async function confirmBooking(db: Database, input: { bookingId: string; userId?: string }) {
  await db.transaction((tx) => markPaid(tx, input.bookingId, "confirmed", input.userId));
}

/**
 * Moves a booking to confirmed or part paid: money has come in. A booking
 * still waiting for payment has its rooms and seats on hold, and they are
 * booked now. A part-paid booking booked them already, so becoming confirmed
 * changes only its status.
 */
export async function markPaid(tx: Tx, bookingId: string, to: "confirmed" | "part_paid", userId?: string, note?: string) {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for("update");
  if (!booking) throw new NotFoundError("Booking");
  if (booking.status === to) return;
  if (!allowedMoves[booking.status].includes(to)) throw new TransitionError(booking.status, to);
  if (booking.status === "pending_payment") await bookHeldStock(tx, booking, userId);
  await tx.update(bookings).set({ status: to }).where(eq(bookings.id, bookingId));
  await tx.insert(bookingEvents).values({ propertyId: booking.propertyId, bookingId, type: "status", fromStatus: booking.status, toStatus: to, userId: userId ?? null, note: note ?? null });
}

/** Turns a booking's held rooms and seats into booked ones, taking again any that were let go. */
async function bookHeldStock(tx: Tx, booking: typeof bookings.$inferSelect, userId?: string) {
  const bookingId = booking.id;
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
}

/**
 * Moves a booking to a new status (BK-04), if allowed. Cancelling or
 * expiring gives its rooms and seats back. Confirmed and part paid go
 * through markPaid, which also books the stock. Check-in and no-show open
 * on the day the guest is due.
 */
export async function changeBookingStatus(db: Database, input: { bookingId: string; to: BookingStatus; userId?: string; note?: string; today?: string }) {
  const to = input.to;
  if (to === "confirmed" || to === "part_paid") return db.transaction((tx) => markPaid(tx, input.bookingId, to, input.userId, input.note));
  await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, input.bookingId)).for("update");
    if (!booking) throw new NotFoundError("Booking");
    if (!allowedMoves[booking.status].includes(input.to)) throw new TransitionError(booking.status, input.to);
    const due = booking.checkIn ?? booking.visitDate;
    if ((input.to === "checked_in" || input.to === "no_show") && due && (input.today ?? todayInIndia()) < due) {
      throw new RuleError(`The guest is due on ${due}. Check-in and no-show open on that day.`);
    }

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

/**
 * Gives a stay another room of the same type for all its nights (RM-04),
 * once its rooms are booked and before check-in. The new room must be free
 * on every night; the old one is let go.
 */
export async function assignUnit(db: Database, input: { bookingItemId: string; unitId: string; userId?: string }) {
  await db.transaction(async (tx) => {
    const [item] = await tx.select().from(bookingItems).where(eq(bookingItems.id, input.bookingItemId)).for("update");
    if (!item || item.kind !== "stay") throw new NotFoundError("Room in the booking");
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, item.bookingId)).for("update");
    if (booking.status !== "confirmed" && booking.status !== "part_paid") throw new RuleError("A room can be changed once a payment is recorded, until check-in.");
    if (item.unitId === input.unitId) return;
    const [unit] = await tx.select().from(units).where(eq(units.id, input.unitId));
    if (!unit || unit.roomTypeId !== item.roomTypeId) throw new RuleError("Choose a room of the same type.");
    if (unit.status !== "active") throw new RuleError(`${unit.name} is not in use.`);
    const nights = nightsOf(booking.checkIn!, booking.checkOut!);

    // Holds that have run out don't count; clear them, then take the nights.
    await tx.execute(sql`
      delete from ${unitNights} using ${holds}
      where ${unitNights.holdId} = ${holds.id} and ${holds.expiresAt} <= now()
        and ${unitNights.unitId} = ${unit.id} and ${unitNights.night} >= ${booking.checkIn} and ${unitNights.night} < ${booking.checkOut}`);
    try {
      await tx.transaction(async (sp) => {
        await sp.insert(unitNights).values(nights.map((night) => ({ propertyId: booking.propertyId, unitId: unit.id, night, bookingId: booking.id })));
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SoldOutError(`${unit.name} is not free on every night of this stay.`);
      throw error;
    }

    const [old] = item.unitId ? await tx.select({ id: units.id, name: units.name }).from(units).where(eq(units.id, item.unitId)) : [];
    if (old) {
      await tx.delete(unitNights).where(and(eq(unitNights.bookingId, booking.id), eq(unitNights.unitId, old.id)));
      await tx.insert(inventoryLog).values({ propertyId: booking.propertyId, action: "cancel", unitId: old.id, fromDate: nights[0], toDate: nights[nights.length - 1], bookingId: booking.id, userId: input.userId ?? null, reason: `Guest moved to ${unit.name}` });
    }
    await tx.insert(inventoryLog).values({ propertyId: booking.propertyId, action: "book", unitId: unit.id, fromDate: nights[0], toDate: nights[nights.length - 1], bookingId: booking.id, userId: input.userId ?? null });
    await tx.update(bookingItems).set({ unitId: unit.id }).where(eq(bookingItems.id, item.id));
    await tx.insert(bookingEvents).values({ propertyId: booking.propertyId, bookingId: booking.id, type: "unit_assigned", userId: input.userId ?? null, data: { from: old?.name ?? null, to: unit.name } });
  });
}

/** An internal note on the booking's timeline (ADM-05). Guests never see it. */
export async function addBookingNote(db: Database, input: { bookingId: string; note: string; userId?: string }) {
  const note = input.note.trim();
  if (!note) throw new RuleError("Write the note first.");
  const [booking] = await db.select({ propertyId: bookings.propertyId }).from(bookings).where(eq(bookings.id, input.bookingId));
  if (!booking) throw new NotFoundError("Booking");
  await db.insert(bookingEvents).values({ propertyId: booking.propertyId, bookingId: input.bookingId, type: "note", userId: input.userId ?? null, note });
}
