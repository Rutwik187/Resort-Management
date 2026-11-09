import { and, eq, lte, sql } from "drizzle-orm";
import { bookingEvents, bookings, guests, holds, properties, type Database } from "@repo/db";
import { lineTitle, type Quote } from "./holds";
import { recordWebsiteLead } from "./leads";
import { cancelHeldMessages } from "./messages";
import { headcount } from "./pricing";
import { freeHoldStock } from "./holds";

/**
 * Ends holds that have run out: their rooms and seats go back, and a booking
 * still waiting for payment becomes Expired (BK-05). The day and night
 * batches run this; it is safe to run twice, and two runs at once skip each
 * other's holds.
 */
export async function expireHolds(db: Database, limit = 200): Promise<number> {
  const abandoned: string[] = [];
  const count = await db.transaction(async (tx) => {
    const due = await tx
      .select({ id: holds.id, bookingId: holds.bookingId, propertyId: holds.propertyId })
      .from(holds)
      .where(and(eq(holds.status, "active"), lte(holds.expiresAt, sql`now()`)))
      .orderBy(holds.expiresAt)
      .limit(limit)
      .for("update", { skipLocked: true });

    for (const hold of due) {
      await freeHoldStock(tx, hold.id);
      await tx.update(holds).set({ status: "expired" }).where(eq(holds.id, hold.id));
      if (!hold.bookingId) continue;
      const expired = await tx
        .update(bookings)
        .set({ status: "expired" })
        .where(and(eq(bookings.id, hold.bookingId), eq(bookings.status, "pending_payment")))
        .returning({ id: bookings.id });
      if (expired.length) {
        await tx.insert(bookingEvents).values({ propertyId: hold.propertyId, bookingId: hold.bookingId, type: "status", fromStatus: "pending_payment", toStatus: "expired", note: "Payment was not completed in time." });
        await cancelHeldMessages(tx, hold.bookingId);
        abandoned.push(hold.bookingId);
      }
    }
    return due.length;
  });
  // A website booking left unpaid becomes a lead, so sales can call the guest (section 12: day batch).
  for (const bookingId of abandoned) {
    try {
      await abandonedBookingLead(db, bookingId);
    } catch (error) {
      console.error(`The abandoned booking ${bookingId} didn't become a lead.`, error);
    }
  }
  return count;
}

async function abandonedBookingLead(db: Database, bookingId: string) {
  const [row] = await db
    .select({ booking: bookings, guest: guests, code: properties.code })
    .from(bookings)
    .innerJoin(guests, eq(guests.id, bookings.guestId))
    .innerJoin(properties, eq(properties.id, bookings.propertyId))
    .where(eq(bookings.id, bookingId));
  if (!row || row.booking.source !== "website" || !row.guest.phone) return;
  const quote = row.booking.quote as Quote;
  await recordWebsiteLead(db, {
    propertyCode: row.code,
    source: "website_booking",
    interest: row.booking.checkIn ? "stay" : "day",
    name: row.guest.name,
    phone: row.guest.phone,
    email: row.guest.email ?? undefined,
    dateFrom: row.booking.checkIn ?? row.booking.visitDate ?? undefined,
    dateTo: row.booking.checkOut ?? undefined,
    guests: quote.lines.reduce((sum, line) => sum + (line.kind === "addon" ? 0 : headcount(line.party)), 0),
    message: `Started booking ${row.booking.number} on the website but didn't finish paying.`,
    request: { booking: row.booking.number, totalPaise: row.booking.totalPaise, lines: quote.lines.map(lineTitle) },
  });
}
