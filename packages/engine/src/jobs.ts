import { and, eq, lte, sql } from "drizzle-orm";
import { bookingEvents, bookings, holds, type Database } from "@repo/db";
import { freeHoldStock } from "./holds";

/**
 * Ends holds that have run out: their rooms and seats go back, and a booking
 * still waiting for payment becomes Expired (BK-05). The day and night
 * batches run this; it is safe to run twice, and two runs at once skip each
 * other's holds.
 */
export async function expireHolds(db: Database, limit = 200): Promise<number> {
  return db.transaction(async (tx) => {
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
      }
    }
    return due.length;
  });
}
