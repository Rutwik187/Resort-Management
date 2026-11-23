import { sql } from "drizzle-orm";
import { bigint, bigserial, boolean, check, date, index, integer, pgEnum, pgTable, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";
import { bookings } from "./bookings";

/** What an offer takes off: a share of the price, a fixed amount, or nothing (an offer the team applies by hand, such as two for one). */
export const discountKind = pgEnum("discount_kind", ["percent", "amount", "none"]);
/** What an offer is for. */
export const offerScope = pgEnum("offer_scope", ["stay", "day", "any"]);
/** The ready-made kinds of offer (OFR-02). The kind only labels it; its rules do the work. */
export const offerKind = pgEnum("offer_kind", ["standard", "early_bird", "last_minute", "long_stay", "festival"]);

/**
 * An offer or coupon (docs/implementation-plan.md, section 9: Offers). Shown
 * on the resort's website when staff choose, and applied to a booking at
 * the desk. With a code, it is a coupon: the guest names it. Each booking
 * takes one offer at most.
 */
export const offers = pgTable(
  "offers",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    title: text().notNull(),
    details: text(),
    /** A coupon code, in capitals. Empty for an offer anyone gets. */
    code: text(),
    discountKind: discountKind().notNull().default("none"),
    /** A percentage from 1 to 100, or an amount in paise, by the kind. Empty for none. */
    discountValue: bigint({ mode: "number" }),
    appliesTo: offerScope().notNull().default("any"),
    /** The nights or visit days it covers. Empty means any. */
    startsOn: date({ mode: "string" }),
    endsOn: date({ mode: "string" }),
    /** The fewest nights a stay needs for it. */
    minNights: smallint(),
    kind: offerKind().notNull().default("standard"),
    /** When the booking must be made (the booking window). Empty means any day. */
    bookFrom: date({ mode: "string" }),
    bookTo: date({ mode: "string" }),
    /** Early bird: book at least this many days before arrival. */
    minDaysAhead: smallint(),
    /** Last minute: book at most this many days before arrival. */
    maxDaysAhead: smallint(),
    /** Days of the week (0 Sunday to 6 Saturday) every night, or the visit day, must fall on. Empty means any. */
    weekdays: smallint().array(),
    /** The room types it covers; empty means all. The discount is taken off these rooms only. */
    roomTypeIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    /** The packages it covers; empty means all. */
    offeringIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    /** Long stay: nights free, such as 1 for "stay 3, pay 2" with at least 3 nights. */
    freeNights: smallint(),
    /** The most bookings it can be used for, in all. */
    maxUses: integer(),
    /** The most bookings one guest (by phone) can use it for. */
    maxUsesPerGuest: integer(),
    /** The least the booking must cost before GST, in paise. */
    minAmountPaise: bigint({ mode: "number" }),
    /** A public coupon shows its code on the website; a private one is given out by the team. */
    showCode: boolean().notNull().default(false),
    onWebsite: boolean().notNull().default(true),
    active: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.propertyId, t.code),
    check(
      "offers_discount",
      sql`(${t.discountKind} = 'none' and ${t.discountValue} is null) or (${t.discountKind} = 'percent' and ${t.discountValue} between 1 and 100) or (${t.discountKind} = 'amount' and ${t.discountValue} > 0)`,
    ),
    check("offers_dates", sql`${t.endsOn} is null or ${t.startsOn} is null or ${t.endsOn} >= ${t.startsOn}`),
    check("offers_book_dates", sql`${t.bookTo} is null or ${t.bookFrom} is null or ${t.bookTo} >= ${t.bookFrom}`),
  ],
);

/**
 * The Offer of the Day (OFR-01): one featured offer per resort per date,
 * scheduled ahead. It shows on the website with a countdown and ends at
 * midnight, or once `quantity` bookings have used it that day.
 */
export const offerDays = pgTable(
  "offer_days",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    day: date({ mode: "string" }).notNull(),
    offerId: uuid()
      .notNull()
      .references(() => offers.id),
    /** The most bookings it covers that day. Empty means no limit. */
    quantity: integer(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [unique().on(t.propertyId, t.day), check("offer_days_quantity", sql`${t.quantity} is null or ${t.quantity} > 0`)],
);

/**
 * Each booking that took an offer or coupon (OFR-03, OFR-05): for the use
 * limits and the offers report. A booking that expired unpaid doesn't count.
 */
export const offerUses = pgTable(
  "offer_uses",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    offerId: uuid()
      .notNull()
      .references(() => offers.id),
    bookingId: uuid()
      .notNull()
      .unique()
      .references(() => bookings.id),
    /** The guest's phone, for the limit per guest. */
    guestKey: text(),
    code: text(),
    discountPaise: bigint({ mode: "number" }).notNull(),
    /** The Offer of the Day it was used as, if any. */
    offerDay: date({ mode: "string" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.offerId), index().on(t.offerId, t.guestKey)],
);
