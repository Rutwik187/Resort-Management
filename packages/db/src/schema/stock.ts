import { sql } from "drizzle-orm";
import {
  bigserial,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { offerings, offeringSlots, roomTypes, units } from "./catalogue";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";

export const holdStatus = pgEnum("hold_status", ["active", "converted", "released", "expired"]);
/** Why staff blocked dates (INV-04). A wedding or corporate buyout blocks a whole resort (INV-05). */
export const blockReason = pgEnum("block_reason", ["maintenance", "owner_use", "ota_allocation", "wedding_buyout", "other"]);
export const inventoryAction = pgEnum("inventory_action", ["hold", "release", "book", "cancel", "block", "unblock", "capacity"]);

/**
 * Rooms or seats kept for a guest while they pay (INV-03). A hold ends at
 * expiresAt; after that its rows count as free, and the next hold clears them.
 */
export const holds = pgTable(
  "holds",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    status: holdStatus().notNull().default("active"),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    /** The priced quote, saved with the hold. The amount charged comes only from here (PR-08). */
    quote: jsonb(),
    /** Set when the hold becomes a booking. */
    bookingId: uuid().references(() => bookings.id),
    ...timestamps,
  },
  (t) => [index().on(t.status, t.expiresAt)],
);

/** Staff blocks: a unit, a whole room type, or (with neither) the whole resort, for a range of nights. */
export const blocks = pgTable(
  "blocks",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    roomTypeId: uuid().references(() => roomTypes.id),
    unitId: uuid().references(() => units.id),
    startsOn: date({ mode: "string" }).notNull(),
    /** The last blocked night. */
    endsOn: date({ mode: "string" }).notNull(),
    reason: blockReason().notNull(),
    note: text(),
    /** Set when staff lift the block. The nights free up; the record stays. */
    liftedAt: timestamp({ withTimezone: true }),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [check("blocks_dates", sql`${t.endsOn} >= ${t.startsOn}`)],
);

/**
 * One row per unit per taken night, and each row is exactly one of a hold,
 * a booking or a block. The primary key makes a double booking impossible:
 * a second guest's insert for the same unit and night fails (INV-03).
 */
export const unitNights = pgTable(
  "unit_nights",
  {
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    unitId: uuid()
      .notNull()
      .references(() => units.id),
    night: date({ mode: "string" }).notNull(),
    holdId: uuid().references(() => holds.id),
    bookingId: uuid().references(() => bookings.id),
    blockId: uuid().references(() => blocks.id),
  },
  (t) => [
    primaryKey({ columns: [t.unitId, t.night] }),
    check("unit_nights_one_owner", sql`num_nonnulls(${t.holdId}, ${t.bookingId}, ${t.blockId}) = 1`),
    index().on(t.propertyId, t.night),
    index().on(t.holdId),
    index().on(t.bookingId),
    index().on(t.blockId),
  ],
);

/**
 * Guests sold and held for one offering slot on one day (INV-09). The
 * check keeps sold plus held within capacity, so a day can't oversell even
 * when many guests pay at once.
 */
export const capacityDays = pgTable(
  "capacity_days",
  {
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    offeringId: uuid()
      .notNull()
      .references(() => offerings.id),
    slotId: uuid()
      .notNull()
      .references(() => offeringSlots.id),
    day: date({ mode: "string" }).notNull(),
    capacity: integer().notNull(),
    sold: integer().notNull().default(0),
    held: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.slotId, t.day] }),
    check("capacity_days_counts", sql`${t.sold} >= 0 and ${t.held} >= 0 and ${t.sold} + ${t.held} <= ${t.capacity}`),
    index().on(t.propertyId, t.day),
  ],
);

/** The guests a hold keeps on one offering slot and day. */
export const capacityHolds = pgTable(
  "capacity_holds",
  {
    holdId: uuid()
      .notNull()
      .references(() => holds.id),
    slotId: uuid()
      .notNull()
      .references(() => offeringSlots.id),
    day: date({ mode: "string" }).notNull(),
    guests: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.holdId, t.slotId, t.day] }), check("capacity_holds_guests", sql`${t.guests} > 0`), index().on(t.slotId, t.day)],
);

/** Why a room or seat is or isn't free on any date (INV-07): every change, with who or what made it. */
export const inventoryLog = pgTable(
  "inventory_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    action: inventoryAction().notNull(),
    unitId: uuid(),
    slotId: uuid(),
    /** The first and last night or day the change covers. */
    fromDate: date({ mode: "string" }).notNull(),
    toDate: date({ mode: "string" }).notNull(),
    holdId: uuid(),
    bookingId: uuid(),
    blockId: uuid(),
    userId: createdBy(),
    reason: text(),
    data: jsonb(),
  },
  (t) => [index().on(t.propertyId, t.fromDate), index().on(t.unitId, t.fromDate)],
);

