import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { addons, offerings, offeringSlots, roomTypes, units } from "./catalogue";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";

/** BK-04. One module in packages/engine says which moves between them are allowed. */
export const bookingStatus = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "part_paid",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
  "refunded",
  "expired",
]);
export const bookingSource = pgEnum("booking_source", ["website", "admin", "phone", "walk_in", "whatsapp", "email", "travel_agent", "corporate", "other"]);
export const bookingItemKind = pgEnum("booking_item_kind", ["stay", "offering", "addon"]);

/** Who is coming, by age band code: { adults: 2, children: { child: 1, infant: 1 } }. */
export type PartyJson = { adults: number; children: Record<string, number> };

/** The terms the guest accepted, by version, and whether they want offers. */
export type ConsentJson = { termsVersion: string; marketing: boolean; at: string; ip?: string | null };

/** A person who booked. Profiles merge by phone and email later (ADM-09). */
export const guests = pgTable(
  "guests",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    /** Digits only, with the country code, such as 919876543210. */
    phone: text(),
    email: text(),
    companyName: text(),
    companyGstin: text(),
    ...timestamps,
  },
  (t) => [index().on(t.phone), index().on(t.email)],
);

/**
 * One booking at one resort (BK-08). It is never deleted, only cancelled,
 * expired or refunded. Its number comes from booking_counters.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    /** Such as KS-26-000123 (BK-03). */
    number: text().notNull().unique(),
    status: bookingStatus().notNull().default("pending_payment"),
    source: bookingSource().notNull(),
    guestId: uuid()
      .notNull()
      .references(() => guests.id),
    /** For stays. Day visits use visitDate. */
    checkIn: date({ mode: "string" }),
    checkOut: date({ mode: "string" }),
    visitDate: date({ mode: "string" }),
    /** Everything the guest pays, GST included, before any refund. Null while a rate is still to be confirmed. */
    totalPaise: bigint({ mode: "number" }),
    /** The price before GST, after any offer or price set by staff. */
    subtotalPaise: bigint({ mode: "number" }),
    /** The GST in the total. */
    taxPaise: bigint({ mode: "number" }),
    /** Money received, less refunds paid. */
    paidPaise: bigint({ mode: "number" }).notNull().default(0),
    refundedPaise: bigint({ mode: "number" }).notNull().default(0),
    /** The SHA-256 of the guest's private manage-booking link. */
    manageTokenHash: text().unique(),
    /** What the guest agreed to on the website, and when. */
    consent: jsonb().$type<ConsentJson>(),
    /** The quote the price came from, kept as it was (PR-08). */
    quote: jsonb(),
    notes: text(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [
    index().on(t.propertyId, t.checkIn),
    index().on(t.propertyId, t.visitDate),
    index().on(t.propertyId, t.status),
    index().on(t.guestId),
    check("bookings_dates", sql`${t.checkOut} is null or ${t.checkOut} > ${t.checkIn}`),
    check("bookings_money", sql`coalesce(${t.totalPaise}, 0) >= 0 and ${t.paidPaise} >= 0`),
  ],
);

/** One room, cottage or offering in a booking, with who it is for and its price. */
export const bookingItems = pgTable(
  "booking_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    kind: bookingItemKind().notNull(),
    roomTypeId: uuid().references(() => roomTypes.id),
    /** The room given to the guest, at booking or at check-in (RM-04). */
    unitId: uuid().references(() => units.id),
    offeringId: uuid().references(() => offerings.id),
    slotId: uuid().references(() => offeringSlots.id),
    addonId: uuid().references(() => addons.id),
    /** Units, people or rooms for an add-on. One for rooms and tickets. */
    quantity: smallint().notNull().default(1),
    /** Who is coming. An add-on's is empty. */
    party: jsonb().$type<PartyJson>().notNull(),
    extraBeds: smallint().notNull().default(0),
    /** Null while the rate is to be confirmed by the team. */
    amountPaise: bigint({ mode: "number" }),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index().on(t.bookingId),
    check(
      "booking_items_kind",
      // Compared as text: Postgres can't use an enum value in the transaction that adds it.
      sql`(${t.kind}::text = 'stay' and ${t.roomTypeId} is not null and ${t.offeringId} is null and ${t.addonId} is null)
        or (${t.kind}::text = 'offering' and ${t.offeringId} is not null and ${t.slotId} is not null and ${t.roomTypeId} is null and ${t.addonId} is null)
        or (${t.kind}::text = 'addon' and ${t.addonId} is not null and ${t.roomTypeId} is null and ${t.offeringId} is null and ${t.quantity} >= 1)`,
    ),
  ],
);

/** The booking's timeline: every status change and every note, with who and when. */
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Such as "created", "status", "note", "unit_assigned". */
    type: text().notNull(),
    fromStatus: bookingStatus(),
    toStatus: bookingStatus(),
    userId: text(),
    note: text(),
    data: jsonb(),
  },
  (t) => [index().on(t.bookingId, t.at)],
);

/** The next booking number for each resort and year, so numbers never repeat. */
export const bookingCounters = pgTable(
  "booking_counters",
  {
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    /** Two digits, such as 26. */
    year: smallint().notNull(),
    next: integer().notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.propertyId, t.year] })],
);
