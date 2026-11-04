import { text, timestamp } from "drizzle-orm/pg-core";

/*
 * Rules for every table (docs/implementation-plan.md, section 4):
 * - Money is whole paise in bigint columns.
 * - Nights and days are `date` values, read as yyyy-mm-dd strings.
 * - Times are stored in UTC and shown in India time.
 * - Every row that belongs to a resort carries its property, when it was
 *   made and changed, and who made it.
 * Column names are written in camelCase here; Drizzle stores them in
 * snake_case (see `casing` in src/client.ts and drizzle.config.ts).
 */

/** When the row was made and last changed. */
export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** The staff member who made the row. Empty when the website or a job made it. */
export const createdBy = () => text();
