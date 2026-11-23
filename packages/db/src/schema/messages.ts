import { boolean, index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createdBy } from "./common";
import { bookings } from "./bookings";
import { leads } from "./leads";
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
    /** The lead it is about, for alerts and replies (NOT-05). */
    leadId: uuid().references(() => leads.id, { onDelete: "set null" }),
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
    /** What the provider says happened after sending: delivered, bounced, complained or failed (NOT-05). */
    delivery: text(),
    deliveryAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.bookingId), index().on(t.leadId)],
);

/**
 * A resort's own wording for a message (NOT-01): its subject and the text
 * at the top, with fields such as {{guestName}} filled in when it is sent.
 * The booking's details, the button and the footer stay as they are. A
 * kind with no template uses the wording in code.
 */
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    kind: text().notNull(),
    channel: messageChannel().notNull().default("email"),
    subject: text().notNull(),
    body: text().notNull(),
    active: boolean().notNull().default(true),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [unique().on(t.propertyId, t.kind, t.channel)],
);
