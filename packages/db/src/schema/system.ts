import { bigserial, boolean, index, integer, jsonb, pgTable, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";
import { bookings } from "./bookings";

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

/**
 * Each background job's lock and last run (plan section 12). A run takes
 * the lock for a few minutes; a second run at the same time finds it taken
 * and skips, so a doubled Vercel Cron call does nothing twice.
 */
export const jobRuns = pgTable("job_runs", {
  name: text().primaryKey(),
  lockedUntil: timestamp({ withTimezone: true }),
  lastStartedAt: timestamp({ withTimezone: true }),
  lastFinishedAt: timestamp({ withTimezone: true }),
  lastResult: jsonb(),
  lastError: text(),
});

/**
 * A guest's ID proof, uploaded at check-in (ADM-08). The file lives in the
 * private Vercel Blob store (encrypted at rest); staff open it only
 * through the admin, which checks their role and logs each view. It is
 * deleted on its own after the resort's retention days.
 */
export const idProofs = pgTable(
  "id_proofs",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    /** The guest it belongs to, as staff named them, such as "Asha Kulkarni" or "Second guest". */
    label: text().notNull(),
    pathname: text().notNull().unique(),
    contentType: text().notNull(),
    size: integer().notNull(),
    uploadedBy: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** The day it is deleted, from the resort's retention days. */
    deleteAfter: timestamp({ withTimezone: true }).notNull(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.bookingId), index().on(t.deleteAfter)],
);

/**
 * A photo in a resort's gallery (URD 4.2, CMS-06), in the public Vercel
 * Blob store. Staff upload many at once into a category, add alt text and
 * a caption, feature or hide them, and set the order.
 */
export const galleryItems = pgTable(
  "gallery_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    category: text().notNull(),
    url: text().notNull(),
    pathname: text().notNull().unique(),
    width: integer(),
    height: integer(),
    /** Required before the photo shows on the website (CMS-09). */
    alt: text(),
    caption: text(),
    featured: boolean().notNull().default(false),
    hidden: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [index().on(t.propertyId, t.category, t.sortOrder)],
);

/**
 * Page text and photos staff change in the admin (plan section 2): one row
 * per slot a site lists, such as home.headline. Edits stay in the draft
 * until published; the site shows the published value, or its own text
 * when there is none.
 */
export const contentSlots = pgTable(
  "content_slots",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    key: text().notNull(),
    draftText: text(),
    draftImageUrl: text(),
    draftImageAlt: text(),
    publishedText: text(),
    publishedImageUrl: text(),
    publishedImageAlt: text(),
    publishedAt: timestamp({ withTimezone: true }),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [unique().on(t.propertyId, t.key)],
);
