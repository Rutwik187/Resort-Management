import { sql } from "drizzle-orm";
import { bigint, check, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";

export const paymentMethod = pgEnum("payment_method", ["cash", "upi", "card", "bank_transfer", "cheque", "other"]);

/**
 * Money taken at the resort or sent straight to the company's bank, which
 * staff record against a booking (docs/implementation-plan.md, section 6:
 * payments at the resort). Razorpay payments get their own tables.
 */
export const offlinePayments = pgTable(
  "offline_payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    method: paymentMethod().notNull(),
    amountPaise: bigint({ mode: "number" }).notNull(),
    /** The UPI or card reference, cheque number or receipt number. */
    reference: text(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    note: text(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [index().on(t.bookingId), index().on(t.propertyId, t.receivedAt), check("offline_payments_amount", sql`${t.amountPaise} > 0`)],
);
