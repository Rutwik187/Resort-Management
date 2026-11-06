import { sql } from "drizzle-orm";
import { bigint, boolean, check, date, integer, pgEnum, pgTable, smallint, text, unique, uuid } from "drizzle-orm/pg-core";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";

/** What an offer takes off: a share of the price, a fixed amount, or nothing (an offer the team applies by hand, such as two for one). */
export const discountKind = pgEnum("discount_kind", ["percent", "amount", "none"]);
/** What an offer is for. */
export const offerScope = pgEnum("offer_scope", ["stay", "day", "any"]);

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
  ],
);
