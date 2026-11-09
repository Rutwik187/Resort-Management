import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { timestamps } from "./common";
import { properties } from "./properties";

export const messageChannel = pgEnum("message_channel", ["email", "whatsapp", "sms"]);
/** Held messages wait for something, such as a payment; queued ones go at the next send. */
export const messageStatus = pgEnum("message_status", ["held", "queued", "sent", "failed", "cancelled"]);

/**
 * The outbox (docs/implementation-plan.md, section 8). A message is saved in
 * the same transaction as the change it reports, then sent after the
 * request, or by the batch job if that fails. Its id is Resend's
 * idempotency key, so a retry never sends it twice.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    bookingId: uuid().references(() => bookings.id),
    channel: messageChannel().notNull().default("email"),
    /** Such as "booking_confirmed" or "refund". */
    kind: text().notNull(),
    to: text().notNull(),
    subject: text().notNull(),
    html: text().notNull(),
    text: text().notNull(),
    status: messageStatus().notNull().default("queued"),
    attempts: integer().notNull().default(0),
    providerId: text(),
    error: text(),
    sentAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.bookingId)],
);
