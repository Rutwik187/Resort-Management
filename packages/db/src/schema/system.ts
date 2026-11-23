import { bigserial, boolean, index, integer, jsonb, pgTable, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";

/**
 * Every create, change, delete, refund, price change and sign-in (USR-05):
 * who, when, from where, which record, and the values before and after.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userId: text(),
    propertyId: uuid().references(() => properties.id),
    ip: text(),
    /** Such as "room_type.create", "rate.update" or "auth.sign_in". */
    action: text().notNull(),
    /** The table, such as "room_types". */
    entity: text().notNull(),
    entityId: text(),
    before: jsonb(),
    after: jsonb(),
  },
  (t) => [index().on(t.propertyId, t.at), index().on(t.entity, t.entityId), index().on(t.userId, t.at)],
);

/**
 * Request counts for the public forms and checkout (SEC-04): one row per
 * key, such as "enquiry:KS:203.0.113.5", with the count in its window.
 * Kept in the database because a serverless function forgets between calls.
 */
export const requestLimits = pgTable("request_limits", {
  key: text().primaryKey(),
  count: integer().notNull().default(0),
  windowStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Google reviews of each resort (REV-01 to REV-04), stored so pages never
 * call Google on a visit. Staff choose which to feature on the home page
 * and can hide one; the overall rating and count come as Google gives them.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    /** Google's own id (or name) of the review. */
    googleId: text().notNull(),
    author: text().notNull(),
    authorUrl: text(),
    photoUrl: text(),
    rating: smallint().notNull(),
    text: text(),
    reviewedAt: timestamp({ withTimezone: true }),
    featured: boolean().notNull().default(false),
    hidden: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [unique().on(t.propertyId, t.googleId), index().on(t.propertyId, t.reviewedAt)],
);

/**
 * Old addresses that move to new ones, per resort (SEO-04, SEO-07): staff
 * add them in the admin, and the site answers the old address with a
 * permanent redirect. The redirects in each site's own code still apply.
 */
export const redirects = pgTable(
  "redirects",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    /** The old path, such as /school-picnic, with no domain. */
    fromPath: text().notNull(),
    /** The new path on the site, or a full address. */
    toPath: text().notNull(),
    hits: integer().notNull().default(0),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [unique().on(t.propertyId, t.fromPath)],
);
