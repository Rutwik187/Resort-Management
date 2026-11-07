import { and, eq, ne, TransactionRollbackError } from "drizzle-orm";
import { bookingEvents, bookingItems, bookings, holds, inventoryLog, unitNights, type Database } from "@repo/db";
import { priceFor, type BookingStatus, type Tx } from "./bookings";
import { ensureInvoice } from "./invoices";
import { isDate, todayInIndia } from "./dates";
import { NotFoundError, RuleError } from "./errors";
import { holdStayIn, type Quote, type StayRequest } from "./holds";

/** Bookings whose stay can still change. A checked-in guest can change their check-out and rooms. */
const changeable: BookingStatus[] = ["pending_payment", "part_paid", "confirmed", "checked_in"];

export type StayChange = {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  rooms: StayRequest[];
  reason: string;
  userId?: string;
  /** Keep the booking's price instead of working it out again, such as a price agreed by hand. */
  keepPrice?: boolean;
  today?: string;
};

/** Logs nights let go or taken, one row a unit. */
async function logNights(tx: Tx, propertyId: string, bookingId: string, action: "release" | "book", rows: { unitId: string; night: string }[], userId?: string, reason?: string) {
  for (const unitId of new Set(rows.map((r) => r.unitId))) {
    const own = rows.filter((r) => r.unitId === unitId).map((r) => r.night).sort();
    await tx.insert(inventoryLog).values({ propertyId, action, unitId, fromDate: own[0], toDate: own[own.length - 1], bookingId, userId: userId ?? null, reason: reason ?? null });
  }
}

/**
 * Changes a stay's dates, rooms or guests (BK-06), all or nothing: the
 * booking lets go of its nights, takes the new ones the way a hold does
 * (so it can't take a room someone else has), and its price is worked out
 * again. If the new nights aren't free, the transaction rolls back and the
 * booking keeps what it had.
 */
export async function changeStay(db: Database, input: StayChange) {
  return db.transaction((tx) => changeStayIn(tx, input));
}

/**
 * What a change would cost, without making it: the same steps in a
 * transaction that is then undone. So the booking's own nights count as
 * free, as they will be.
 */
export async function quoteChange(db: Database, input: Omit<StayChange, "reason">) {
  let result: Awaited<ReturnType<typeof changeStayIn>> | undefined;
  try {
    await db.transaction(async (tx) => {
      result = await changeStayIn(tx, { ...input, reason: "Price check" });
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return result!;
}

async function changeStayIn(tx: Tx, input: StayChange) {
  if (!isDate(input.checkIn) || !isDate(input.checkOut) || input.checkOut <= input.checkIn) throw new RuleError("Choose check-in, then a later check-out.");
  if (input.reason.trim().length < 3) throw new RuleError("Say why the booking is changing.");
  const today = input.today ?? todayInIndia();
  {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, input.bookingId)).for("update");
    if (!booking) throw new NotFoundError("Booking");
    if (!booking.checkIn || !booking.checkOut) throw new RuleError("Only a stay's dates and rooms can change here.");
    if (!changeable.includes(booking.status)) throw new RuleError("Only a booking that is waiting for payment, paid or checked in can change.");
    if (booking.status === "checked_in") {
      if (input.checkIn !== booking.checkIn) throw new RuleError("The guest is checked in, so check-in stays. Change the check-out instead.");
      if (input.checkOut < today) throw new RuleError("Check-out can't be in the past.");
    } else if (input.checkIn < today) {
      throw new RuleError("Check-in can't be in the past.");
    }

    // Let go of the booking's nights: its hold's while it waits for payment, its own once booked.
    const pending = booking.status === "pending_payment";
    const [oldHold] = await tx.select().from(holds).where(and(eq(holds.bookingId, booking.id), ne(holds.status, "released")));
    const returned = { unitId: unitNights.unitId, night: unitNights.night };
    const freed = pending
      ? oldHold
        ? await tx.delete(unitNights).where(eq(unitNights.holdId, oldHold.id)).returning(returned)
        : []
      : await tx.delete(unitNights).where(eq(unitNights.bookingId, booking.id)).returning(returned);

    // Take the new nights. A sold-out night throws, and the whole change rolls back.
    const hold = await holdStayIn(tx, { propertyId: booking.propertyId, checkIn: input.checkIn, checkOut: input.checkOut, rooms: input.rooms });
    if (oldHold) await tx.update(holds).set({ status: "released", bookingId: null }).where(eq(holds.id, oldHold.id));
    if (pending) {
      // Still waiting for payment: the new hold, with a fresh time limit, is the booking's.
      await tx.update(holds).set({ bookingId: booking.id }).where(eq(holds.id, hold.holdId));
    } else {
      const taken = await tx.update(unitNights).set({ bookingId: booking.id, holdId: null }).where(eq(unitNights.holdId, hold.holdId)).returning(returned);
      await tx.update(holds).set({ status: "converted", bookingId: booking.id }).where(eq(holds.id, hold.holdId));
      await logNights(tx, booking.propertyId, booking.id, "book", taken, input.userId);
    }
    await logNights(tx, booking.propertyId, booking.id, "release", freed, input.userId, input.reason.trim());

    // The stay's rooms and price, and the timeline.
    await tx.delete(bookingItems).where(and(eq(bookingItems.bookingId, booking.id), eq(bookingItems.kind, "stay")));
    await tx.insert(bookingItems).values(
      hold.quote.lines.flatMap((line, i) =>
        line.kind === "stay"
          ? [{ propertyId: booking.propertyId, bookingId: booking.id, kind: "stay" as const, roomTypeId: line.roomTypeId, unitId: line.unitId, party: line.party, extraBeds: line.extraBeds, amountPaise: line.totalPaise, sortOrder: i }]
          : [],
      ),
    );
    // A price kept by hand keeps its price before GST; GST is worked out again on the new nights.
    const price = await priceFor(tx, booking.propertyId, hold.quote, input.keepPrice ? booking.subtotalPaise : undefined);
    const totalPaise = price.totalPaise;
    await tx.update(bookings).set({ checkIn: input.checkIn, checkOut: input.checkOut, quote: hold.quote, ...price }).where(eq(bookings.id, booking.id));
    const rooms = (quote: Quote) => quote.lines.flatMap((line) => (line.kind === "stay" ? [`${line.roomTypeName} (${line.unitName})`] : []));
    await tx.insert(bookingEvents).values({
      propertyId: booking.propertyId,
      bookingId: booking.id,
      type: "changed",
      userId: input.userId ?? null,
      note: input.reason.trim(),
      data: {
        from: { checkIn: booking.checkIn, checkOut: booking.checkOut, totalPaise: booking.totalPaise, rooms: rooms(booking.quote as Quote) },
        to: { checkIn: input.checkIn, checkOut: input.checkOut, totalPaise, rooms: rooms(hold.quote) },
      },
    });
    await ensureInvoice(tx, booking.id, input.userId, today);
    return { fromPaise: booking.totalPaise, toPaise: totalPaise, paidPaise: booking.paidPaise, quote: hold.quote };
  }
}
