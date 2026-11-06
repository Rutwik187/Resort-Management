import { bigserial, date, index, jsonb, pgEnum, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bookings } from "./bookings";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";

/** Where a lead stands: new, the team has been in touch, a price was sent, it booked, or it went elsewhere. */
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "quoted", "won", "lost"]);
/** How the lead came: a request from the website's booking widget or enquiry form, or one staff took. */
export const leadSource = pgEnum("lead_source", ["website_booking", "website_enquiry", "phone", "walk_in", "whatsapp", "email", "referral", "other"]);
/** What the guest wants. */
export const leadInterest = pgEnum("lead_interest", ["stay", "day", "wedding", "event", "other"]);

/**
 * Someone who asked about a stay, a day visit, a wedding or an event, and
 * hasn't booked yet (docs/implementation-plan.md, section 9: Leads). The
 * websites make them from every booking request and enquiry; staff add the
 * ones that come by phone or at the desk.
 */
export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    status: leadStatus().notNull().default("new"),
    source: leadSource().notNull(),
    interest: leadInterest().notNull().default("stay"),
    name: text().notNull(),
    /** Digits only, with the country code, such as 919876543210. */
    phone: text(),
    email: text(),
    /** The day of the visit or event, or a stay's first night. */
    dateFrom: date({ mode: "string" }),
    /** A stay's check-out day. */
    dateTo: date({ mode: "string" }),
    guests: smallint(),
    message: text(),
    /** What a website request held: each room or pass with who comes and its price, and the estimate. */
    request: jsonb(),
    /** The staff member working it. */
    assignedTo: text().references(() => user.id),
    /** The day someone should get back to the guest. */
    followUpOn: date({ mode: "string" }),
    /** The booking it became. */
    bookingId: uuid().references(() => bookings.id),
    lostReason: text(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [index().on(t.propertyId, t.status, t.createdAt), index().on(t.propertyId, t.followUpOn), index().on(t.phone)],
);

/** Everything that happened to a lead: made, website requests, notes, status, follow-ups and the booking. */
export const leadActivities = pgTable(
  "lead_activities",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Empty when the website or a job did it. */
    userId: text(),
    /** Such as "created", "request", "note", "status", "assigned", "follow_up" or "booked". */
    type: text().notNull(),
    note: text(),
    data: jsonb(),
  },
  (t) => [index().on(t.leadId, t.at)],
);
