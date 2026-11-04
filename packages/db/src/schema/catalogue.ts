import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdBy, timestamps } from "./common";
import { ageBands, properties } from "./properties";

/** What a room type is (RM-01). */
export const roomCategory = pgEnum("room_category", ["room", "cottage", "villa", "tent", "dormitory", "other"]);
export const roomTypeStatus = pgEnum("room_type_status", ["active", "inactive"]);
/** A unit under maintenance or inactive can't be sold (RM-02). */
export const unitStatus = pgEnum("unit_status", ["active", "maintenance", "inactive"]);
/** Which nights a rate is for. "any" is the same rate every night. */
export const dayKind = pgEnum("day_kind", ["weekday", "weekend", "any"]);
/** "room": the base price covers the room's base occupancy. "person": each adult pays the base price. */
export const priceBasis = pgEnum("price_basis", ["room", "person"]);
/** Room only, with breakfast, with breakfast and one meal, or all meals. */
export const mealPlan = pgEnum("meal_plan", ["EP", "CP", "MAP", "AP"]);
/** Things sold by the day and the seat, not by the room night. */
export const offeringKind = pgEnum("offering_kind", ["day_package", "activity", "dining", "other"]);

/**
 * A kind of room, cottage, villa, tent or dormitory (RM-01). Its units are
 * the rooms themselves.
 */
export const roomTypes = pgTable(
  "room_types",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    /** Stable and short, such as "glass-house". It also links the room type's photos and text. */
    code: text().notNull(),
    name: text().notNull(),
    category: roomCategory().notNull().default("room"),
    /** Guests the base price covers. Extra adults and children pay on top (PR-05). */
    baseOccupancy: smallint().notNull().default(2),
    /** The fewest paying guests it takes, such as 20 for a villa let to large groups. */
    minGuests: smallint().notNull().default(1),
    maxAdults: smallint().notNull(),
    maxChildren: smallint().notNull().default(0),
    maxGuests: smallint().notNull(),
    extraBedAllowed: boolean().notNull().default(false),
    sizeSqft: integer(),
    bedType: text(),
    status: roomTypeStatus().notNull().default("active"),
    sortOrder: integer().notNull().default(0),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.propertyId, t.code),
    check(
      "room_types_guests",
      sql`${t.baseOccupancy} >= 1 and ${t.minGuests} >= 1 and ${t.maxGuests} >= ${t.baseOccupancy} and ${t.maxGuests} >= ${t.minGuests} and ${t.maxAdults} >= 1`,
    ),
  ],
);

/** One room, cottage or tent that a guest sleeps in, such as "Cottage 7" (RM-02). */
export const units = pgTable(
  "units",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    roomTypeId: uuid()
      .notNull()
      .references(() => roomTypes.id),
    name: text().notNull(),
    /** Block or floor, such as "Riverside" or "First floor". */
    block: text(),
    status: unitStatus().notNull().default("active"),
    sortOrder: integer().notNull().default(0),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [unique().on(t.roomTypeId, t.name), index().on(t.propertyId)],
);

/** A named stretch of dates with its own rates, such as "Diwali" or "Monsoon" (PR-03). */
export const seasons = pgTable(
  "seasons",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    name: text().notNull(),
    startsOn: date({ mode: "string" }).notNull(),
    endsOn: date({ mode: "string" }).notNull(),
    /** When seasons overlap, the higher one wins. */
    priority: integer().notNull().default(0),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [check("seasons_dates", sql`${t.endsOn} >= ${t.startsOn}`)],
);

/**
 * A room type's price for one kind of night: the base rate, or a season's
 * rate. Prices are paise. A price that is not set is not guessed: the guest
 * sees "rate to confirm" (PR-01, PR-02, PR-03, PR-05).
 */
export const rates = pgTable(
  "rates",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    roomTypeId: uuid()
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    /** Empty for the base rate. */
    seasonId: uuid().references(() => seasons.id, { onDelete: "cascade" }),
    dayKind: dayKind().notNull().default("any"),
    basis: priceBasis().notNull().default("room"),
    basePaise: bigint({ mode: "number" }).notNull(),
    extraAdultPaise: bigint({ mode: "number" }),
    extraBedPaise: bigint({ mode: "number" }),
    mealPlan: mealPlan().notNull().default("EP"),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.roomTypeId, t.seasonId, t.dayKind).nullsNotDistinct(),
    check("rates_money", sql`${t.basePaise} >= 0 and coalesce(${t.extraAdultPaise}, 0) >= 0 and coalesce(${t.extraBedPaise}, 0) >= 0`),
  ],
);

/** What a child in one age band pays, per night, on a rate. No row means the rate is not published. */
export const rateChildPrices = pgTable(
  "rate_child_prices",
  {
    rateId: uuid()
      .notNull()
      .references(() => rates.id, { onDelete: "cascade" }),
    ageBandId: uuid()
      .notNull()
      .references(() => ageBands.id),
    paise: bigint({ mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.rateId, t.ageBandId] }), check("rate_child_prices_money", sql`${t.paise} >= 0`)],
);

/** A base price for one night, set from the inventory calendar (PR-04). It beats seasons and base rates. */
export const dateRates = pgTable(
  "date_rates",
  {
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    roomTypeId: uuid()
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    night: date({ mode: "string" }).notNull(),
    basePaise: bigint({ mode: "number" }).notNull(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.roomTypeId, t.night] }), check("date_rates_money", sql`${t.basePaise} >= 0`)],
);

/** Rules for one room type on one night: stop sell, minimum and maximum nights, closed to arrival (INV-08). */
export const stayRules = pgTable(
  "stay_rules",
  {
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    roomTypeId: uuid()
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    night: date({ mode: "string" }).notNull(),
    stopSell: boolean().notNull().default(false),
    /** Applies to stays that start on this night. */
    minNights: smallint(),
    maxNights: smallint(),
    closedToArrival: boolean().notNull().default(false),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.roomTypeId, t.night] }),
    check("stay_rules_nights", sql`coalesce(${t.minNights}, 1) >= 1 and coalesce(${t.maxNights}, 365) >= coalesce(${t.minNights}, 1)`),
  ],
);

/**
 * Something sold by the day and counted in guests, not rooms: a day package
 * or picnic (INV-09), an activity, or a seat at a restaurant sitting. Each
 * has one or more slots, and each slot a guest limit per day.
 */
export const offerings = pgTable(
  "offerings",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    kind: offeringKind().notNull(),
    code: text().notNull(),
    name: text().notNull(),
    summary: text(),
    /** What one adult pays. Children pay by age band (offering_child_prices). */
    adultPaise: bigint({ mode: "number" }).notNull(),
    /** Days of the week it is sold: 0 is Sunday. Empty means every day. */
    soldOn: smallint().array(),
    validFrom: date({ mode: "string" }),
    validTo: date({ mode: "string" }),
    active: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [unique().on(t.propertyId, t.code), check("offerings_money", sql`${t.adultPaise} >= 0`)],
);

/** What a child in one age band pays for an offering. No row means not published. */
export const offeringChildPrices = pgTable(
  "offering_child_prices",
  {
    offeringId: uuid()
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    ageBandId: uuid()
      .notNull()
      .references(() => ageBands.id),
    paise: bigint({ mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.offeringId, t.ageBandId] }), check("offering_child_prices_money", sql`${t.paise} >= 0`)],
);

/**
 * A time an offering runs, such as "Morning, 9:00 am to 6:00 pm" or
 * "Lunch, 12:30 to 3:30 pm". An all-day offering has one slot with no times.
 */
export const offeringSlots = pgTable(
  "offering_slots",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    offeringId: uuid()
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    label: text().notNull(),
    startsAt: time(),
    endsAt: time(),
    /** Guests per day unless a day sets its own (capacity_days). */
    defaultCapacity: integer().notNull(),
    active: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [unique().on(t.offeringId, t.label), check("offering_slots_capacity", sql`${t.defaultCapacity} >= 0`)],
);
