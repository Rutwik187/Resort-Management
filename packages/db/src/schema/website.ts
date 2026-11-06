import { boolean, date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";

/**
 * A short notice on a resort's website, such as "The pool is closed for
 * cleaning on 12 November". Notices are the plan's pop-ups and
 * announcement bar (docs/implementation-plan.md, section 2). One shows at
 * a time, from its first day to its last, in a small card guests can
 * close.
 */
export const siteNotices = pgTable("site_notices", {
  id: uuid().primaryKey().defaultRandom(),
  propertyId: uuid()
    .notNull()
    .references(() => properties.id),
  message: text().notNull(),
  /** An optional link, such as "See the offer" to /stays. */
  linkLabel: text(),
  linkUrl: text(),
  startsOn: date({ mode: "string" }),
  endsOn: date({ mode: "string" }),
  active: boolean().notNull().default(true),
  createdBy: createdBy(),
  ...timestamps,
});
