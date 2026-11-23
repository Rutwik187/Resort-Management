import { bigint, bigserial, date, index, integer, jsonb, pgEnum, pgTable, smallint, text, time, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bookings } from "./bookings";
import { createdBy, timestamps } from "./common";
import { properties } from "./properties";

/**
 * Where a lead stands in the pipeline (URD 7.5): new, contacted, site visit
 * scheduled, site visit done, quotation sent ("quoted"), negotiation, then
 * booked ("won") or lost, with a reason.
 */
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "site_visit_scheduled", "site_visit_done", "quoted", "negotiation", "won", "lost"]);
/** How the lead came: the website's booking widget or a form, a Meta or Google lead ad, or one staff took. */
export const leadSource = pgEnum("lead_source", ["website_booking", "website_enquiry", "meta_ads", "google_ads", "phone", "walk_in", "whatsapp", "email", "referral", "other"]);
/** What the guest wants. */
export const leadInterest = pgEnum("lead_interest", ["stay", "day", "wedding", "corporate", "event", "other"]);

/** Statuses of a lead still being worked. */
export const openLeadStatuses = ["new", "contacted", "site_visit_scheduled", "site_visit_done", "quoted", "negotiation"] as const;

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
    /** The time that day, in India. Empty means any time that day. */
    followUpTime: time(),
    /** The guest's budget, as they put it, such as "₹5 to 8 lakh". */
    budget: text(),
    /** What the team expects it to be worth, in paise. */
    estimatedValuePaise: bigint({ mode: "number" }),
    /** Advances taken against the lead before it is booked, such as a wedding's, in paise (CRM-08). */
    advancePaise: bigint({ mode: "number" }).notNull().default(0),
    /** The extra fields a form asked, such as a corporate enquiry's company and meeting needs. */
    details: jsonb().$type<Record<string, string>>(),
    /** UTM tags and click IDs from the visit (TRK-04). */
    campaign: jsonb().$type<Record<string, string>>(),
    /** What the guest agreed to on the form, with the policy version and time (WEB-08, DPP-01). */
    consent: jsonb().$type<{ version: string; marketing: boolean; at: string }>(),
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

/**
 * Who new leads go to (CRM-02): for a resort and, optionally, one kind of
 * lead, a list of staff taken in turn. A lead with no matching rule waits
 * for someone to take it.
 */
export const leadAssignmentRules = pgTable(
  "lead_assignment_rules",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    /** Empty for every kind of lead without a rule of its own. */
    interest: leadInterest(),
    userIds: text().array().notNull(),
    /** The next person's place in the list. */
    nextIndex: integer().notNull().default(0),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [unique().on(t.propertyId, t.interest).nullsNotDistinct()],
);
