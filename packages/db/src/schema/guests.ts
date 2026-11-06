import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./common";

/**
 * What staff know about a guest across bookings (ADM-09, ADM-10): tags such
 * as VIP, a note, and whether they agreed to marketing. A guest is every
 * guests row with the same phone number, or the same email when there is no
 * phone, so the key is "p:919876543210" or "e:name@example.com".
 */
export const guestProfiles = pgTable("guest_profiles", {
  key: text().primaryKey(),
  tags: text().array().notNull().default([]),
  note: text(),
  marketingConsent: boolean().notNull().default(false),
  /** When their personal details were removed on request. Their bookings stay, as tax law needs. */
  removedAt: timestamp({ withTimezone: true }),
  updatedBy: text(),
  ...timestamps,
});
