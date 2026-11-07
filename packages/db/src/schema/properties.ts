import { sql } from "drizzle-orm";
import { bigint, boolean, check, integer, pgTable, smallint, text, time, unique, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./common";

/**
 * The four resorts. Each is its own company, with its own GSTIN, its own
 * Razorpay account and its own booking numbers (KS-26-000123).
 */
export const properties = pgTable(
  "properties",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** KS, GC, SB or PV: the prefix of the resort's booking numbers. */
    code: text().notNull().unique(),
    name: text().notNull(),
    legalName: text(),
    gstin: text(),
    address: text(),
    email: text(),
    phone: text(),
    timezone: text().notNull().default("Asia/Kolkata"),
    checkInTime: time().notNull().default("13:00"),
    checkOutTime: time().notNull().default("10:00"),
    /** The nights that take the weekend rate, by day of the week: 0 is Sunday, 5 Friday, 6 Saturday (PR-02). */
    weekendNights: smallint().array().notNull().default(sql`'{5,6}'::smallint[]`),
    /** How long a guest's rooms stay held while they pay (INV-03). */
    holdMinutes: integer().notNull().default(15),
    /** Alert the manager when a room type is down to this many units for a night (INV-10). */
    lowStockThreshold: integer().notNull().default(1),
    /** The share of the price a guest pays online to confirm. The rest is paid at the resort. */
    advancePercent: smallint().notNull().default(100),
    /** Refunds above this need someone who may approve refunds. Empty: every refund does. */
    refundApprovalPaise: bigint({ mode: "number" }),
    /** For GST invoices: the state the resort is in. Maharashtra is 27. */
    stateCode: text().notNull().default("27"),
    stateName: text().notNull().default("Maharashtra"),
    active: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    check("properties_code_format", sql`${t.code} ~ '^[A-Z]{2,4}$'`),
    check("properties_hold_minutes", sql`${t.holdMinutes} between 1 and 120`),
    check("properties_advance_percent", sql`${t.advancePercent} between 1 and 100`),
  ],
);

/**
 * Child age bands, set per resort (PR-05). For example: under 3 free,
 * 3 to 5, and 5 to 11. Guests above the oldest band pay as adults.
 */
export const ageBands = pgTable(
  "age_bands",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    /** Short and stable, such as "infant" or "child", for prices and reports. */
    code: text().notNull(),
    label: text().notNull(),
    minAge: smallint().notNull(),
    maxAge: smallint().notNull(),
    /** Guests in a free band never pay, and need no price. */
    free: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [unique().on(t.propertyId, t.code), check("age_bands_range", sql`${t.minAge} >= 0 and ${t.maxAge} >= ${t.minAge}`)],
);
