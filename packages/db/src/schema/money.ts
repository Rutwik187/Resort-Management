import { sql } from "drizzle-orm";
import { bigint, bigserial, boolean, check, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, smallint, text, timestamp, unique, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { createdBy, timestamps } from "./common";
import { offerScope } from "./offers";
import { properties } from "./properties";

export const paymentMethod = pgEnum("payment_method", ["cash", "upi", "card", "bank_transfer", "cheque", "other"]);

/**
 * Money taken at the resort or sent straight to the company's bank, which
 * staff record against a booking (docs/implementation-plan.md, section 6:
 * payments at the resort). Razorpay payments get their own tables.
 */
export const offlinePayments = pgTable(
  "offline_payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    method: paymentMethod().notNull(),
    amountPaise: bigint({ mode: "number" }).notNull(),
    /** The UPI or card reference, cheque number or receipt number. */
    reference: text(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    note: text(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [index().on(t.bookingId), index().on(t.propertyId, t.receivedAt), check("offline_payments_amount", sql`${t.amountPaise} > 0`)],
);

/** What a GST rule covers: room nights, seats (day packages, activities, meals) or add-ons. */
export const taxTarget = pgEnum("tax_target", ["room", "offering", "addon"]);

/**
 * GST rules, as data (docs/implementation-plan.md, section 5: tax rules). A
 * rule covers one kind of supply in one value band per unit per day, from a
 * start date. Rooms are charged by the price of each room for each night:
 * for example 5% up to ₹7,500 and 18% above it. The newest rule that has
 * started wins, so a change in GST is a new row, never an edit of the past.
 * The client's chartered accountant confirms the rates.
 */
export const taxRules = pgTable(
  "tax_rules",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    appliesTo: taxTarget().notNull(),
    /** Such as "Rooms up to ₹7,500 a night". */
    label: text().notNull(),
    /** The Services Accounting Code for the invoice, such as 996311 for rooms. */
    sac: text(),
    /** The band of value per unit per day, both ends included. No top means no limit. */
    minUnitPaise: bigint({ mode: "number" }).notNull().default(0),
    maxUnitPaise: bigint({ mode: "number" }),
    /** In hundredths of a percent: 500 is 5%. */
    rateBps: integer().notNull(),
    startsOn: date({ mode: "string" }).notNull(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [
    index().on(t.propertyId, t.appliesTo),
    check("tax_rules_rate", sql`${t.rateBps} between 0 and 2800`),
    check("tax_rules_band", sql`${t.minUnitPaise} >= 0 and (${t.maxUnitPaise} is null or ${t.maxUnitPaise} >= ${t.minUnitPaise})`),
  ],
);

/**
 * The resort's cancellation rules: how much comes back when a guest cancels
 * a given number of days or more before they arrive. The rule with the most
 * days that the cancellation meets applies. With no rule, staff decide.
 */
export const cancellationRules = pgTable(
  "cancellation_rules",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    appliesTo: offerScope().notNull().default("any"),
    /** At least this many whole days before check-in or the visit. */
    daysBefore: smallint().notNull(),
    refundPercent: smallint().notNull(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.propertyId, t.appliesTo, t.daysBefore),
    check("cancellation_rules_days", sql`${t.daysBefore} >= 0`),
    check("cancellation_rules_percent", sql`${t.refundPercent} between 0 and 100`),
  ],
);

export const invoiceKind = pgEnum("invoice_kind", ["invoice", "credit_note"]);

/** One line on an invoice, as it was printed. */
export type InvoiceLineJson = { description: string; sac: string | null; quantity: number; unit: string; taxablePaise: number; rateBps: number; taxPaise: number };
/** Who the invoice is from or to, as it was then. */
export type InvoicePartyJson = { name: string; gstin?: string | null; address?: string | null; phone?: string | null; email?: string | null; stateCode?: string | null; stateName?: string | null };

/**
 * GST invoices and credit notes (PR-07). A booking gets its invoice when it
 * is first paid for or confirmed. A credit note undoes all or part of an
 * invoice: after a refund, or before a changed stay gets a new invoice.
 * Rows are never changed or deleted. Each company numbers its own, with no
 * gaps, per financial year: KS/2627/000001 and, for credit notes, KS/CN/2627/0001.
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    kind: invoiceKind().notNull(),
    number: text().notNull().unique(),
    /** Such as "2026-27", April to March. */
    financialYear: text().notNull(),
    issuedOn: date({ mode: "string" }).notNull(),
    seller: jsonb().$type<InvoicePartyJson>().notNull(),
    buyer: jsonb().$type<InvoicePartyJson>().notNull(),
    lines: jsonb().$type<InvoiceLineJson[]>().notNull(),
    taxablePaise: bigint({ mode: "number" }).notNull(),
    cgstPaise: bigint({ mode: "number" }).notNull(),
    sgstPaise: bigint({ mode: "number" }).notNull(),
    /** Always zero for a stay: the place of supply is where the resort is. Kept for completeness. */
    igstPaise: bigint({ mode: "number" }).notNull().default(0),
    totalPaise: bigint({ mode: "number" }).notNull(),
    /** For a credit note, the invoice it reduces. */
    invoiceId: uuid().references((): AnyPgColumn => invoices.id),
    reason: text(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [index().on(t.bookingId), index().on(t.propertyId, t.issuedOn), check("invoices_money", sql`${t.taxablePaise} >= 0 and ${t.totalPaise} >= 0`)],
);

/** The next invoice or credit note number for each company and financial year. */
export const invoiceCounters = pgTable(
  "invoice_counters",
  {
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    financialYear: text().notNull(),
    kind: invoiceKind().notNull(),
    next: integer().notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.propertyId, t.financialYear, t.kind] })],
);

export const paymentMode = pgEnum("payment_mode", ["test", "live"]);

/**
 * Each company's Razorpay account (docs/implementation-plan.md, section 6).
 * The key secret and the webhook secret are encrypted with AES-256-GCM
 * under PAYMENT_KEYS_SECRET, and only the Super Admin changes them. A
 * resort without an active account takes requests on WhatsApp instead.
 */
export const paymentAccounts = pgTable("payment_accounts", {
  propertyId: uuid()
    .primaryKey()
    .references(() => properties.id),
  mode: paymentMode().notNull().default("test"),
  keyId: text().notNull(),
  /** Encrypted: iv.tag.ciphertext, in base64url. */
  keySecret: text().notNull(),
  webhookSecret: text(),
  active: boolean().notNull().default(true),
  updatedBy: text(),
  ...timestamps,
});

export const onlinePaymentStatus = pgEnum("online_payment_status", ["created", "paid", "failed", "expired", "cancelled"]);
export const onlinePaymentVia = pgEnum("online_payment_via", ["checkout", "link"]);

/**
 * One request for money through Razorpay: an order the guest pays at
 * checkout on the website, or a payment link staff send for a balance or a
 * price difference. It is paid once, by the checkout's signed answer or by
 * a webhook, whichever comes first.
 */
export const onlinePayments = pgTable(
  "online_payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    via: onlinePaymentVia().notNull(),
    mode: paymentMode().notNull(),
    /** Razorpay's order_… for checkout, or plink_… for a link. */
    orderId: text().unique(),
    linkId: text().unique(),
    linkUrl: text(),
    /** Razorpay's pay_…, once paid. */
    paymentId: text().unique(),
    amountPaise: bigint({ mode: "number" }).notNull(),
    status: onlinePaymentStatus().notNull().default("created"),
    /** card, upi, netbanking, wallet… as Razorpay reports it. */
    method: text(),
    paidAt: timestamp({ withTimezone: true }),
    error: text(),
    createdBy: createdBy(),
    ...timestamps,
  },
  (t) => [index().on(t.bookingId), index().on(t.status, t.createdAt), check("online_payments_amount", sql`${t.amountPaise} > 0`)],
);

export const refundStatus = pgEnum("refund_status", ["requested", "processing", "processed", "failed", "rejected"]);

/**
 * Money going back to a guest. Through Razorpay against an online payment,
 * or by hand (cash or bank) against the booking. A refund above the
 * resort's limit waits for someone who may approve refunds (section 6).
 */
export const refunds = pgTable(
  "refunds",
  {
    id: uuid().primaryKey().defaultRandom(),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    /** Empty for a refund paid by hand. */
    onlinePaymentId: uuid().references(() => onlinePayments.id),
    /** For a refund paid by hand: how. */
    method: paymentMethod(),
    amountPaise: bigint({ mode: "number" }).notNull(),
    reason: text().notNull(),
    status: refundStatus().notNull().default("requested"),
    /** Razorpay's rfnd_…. */
    providerRefundId: text().unique(),
    reference: text(),
    requestedBy: text(),
    decidedBy: text(),
    decidedAt: timestamp({ withTimezone: true }),
    processedAt: timestamp({ withTimezone: true }),
    error: text(),
    ...timestamps,
  },
  (t) => [index().on(t.bookingId), index().on(t.propertyId, t.status), check("refunds_amount", sql`${t.amountPaise} > 0`)],
);

/**
 * Every webhook received, once (section 6: webhooks). The same event sent
 * twice finds its row and changes nothing.
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    propertyId: uuid().references(() => properties.id),
    provider: text().notNull(),
    eventId: text().notNull(),
    type: text().notNull(),
    payload: jsonb().notNull(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp({ withTimezone: true }),
    error: text(),
  },
  (t) => [unique().on(t.provider, t.eventId), index().on(t.receivedAt)],
);
