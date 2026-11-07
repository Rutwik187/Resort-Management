CREATE TYPE "public"."invoice_kind" AS ENUM('invoice', 'credit_note');--> statement-breakpoint
CREATE TYPE "public"."online_payment_status" AS ENUM('created', 'paid', 'failed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."online_payment_via" AS ENUM('checkout', 'link');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('test', 'live');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('requested', 'processing', 'processed', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tax_target" AS ENUM('room', 'offering', 'addon');--> statement-breakpoint
CREATE TABLE "cancellation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"applies_to" "offer_scope" DEFAULT 'any' NOT NULL,
	"days_before" smallint NOT NULL,
	"refund_percent" smallint NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cancellation_rules_propertyId_appliesTo_daysBefore_unique" UNIQUE("property_id","applies_to","days_before"),
	CONSTRAINT "cancellation_rules_days" CHECK ("cancellation_rules"."days_before" >= 0),
	CONSTRAINT "cancellation_rules_percent" CHECK ("cancellation_rules"."refund_percent" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "invoice_counters" (
	"property_id" uuid NOT NULL,
	"financial_year" text NOT NULL,
	"kind" "invoice_kind" NOT NULL,
	"next" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "invoice_counters_property_id_financial_year_kind_pk" PRIMARY KEY("property_id","financial_year","kind")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" "invoice_kind" NOT NULL,
	"number" text NOT NULL,
	"financial_year" text NOT NULL,
	"issued_on" date NOT NULL,
	"seller" jsonb NOT NULL,
	"buyer" jsonb NOT NULL,
	"lines" jsonb NOT NULL,
	"taxable_paise" bigint NOT NULL,
	"cgst_paise" bigint NOT NULL,
	"sgst_paise" bigint NOT NULL,
	"igst_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint NOT NULL,
	"invoice_id" uuid,
	"reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_number_unique" UNIQUE("number"),
	CONSTRAINT "invoices_money" CHECK ("invoices"."taxable_paise" >= 0 and "invoices"."total_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "online_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"via" "online_payment_via" NOT NULL,
	"mode" "payment_mode" NOT NULL,
	"order_id" text,
	"link_id" text,
	"link_url" text,
	"payment_id" text,
	"amount_paise" bigint NOT NULL,
	"status" "online_payment_status" DEFAULT 'created' NOT NULL,
	"method" text,
	"paid_at" timestamp with time zone,
	"error" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "online_payments_orderId_unique" UNIQUE("order_id"),
	CONSTRAINT "online_payments_linkId_unique" UNIQUE("link_id"),
	CONSTRAINT "online_payments_paymentId_unique" UNIQUE("payment_id"),
	CONSTRAINT "online_payments_amount" CHECK ("online_payments"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_accounts" (
	"property_id" uuid PRIMARY KEY NOT NULL,
	"mode" "payment_mode" DEFAULT 'test' NOT NULL,
	"key_id" text NOT NULL,
	"key_secret" text NOT NULL,
	"webhook_secret" text,
	"active" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"online_payment_id" uuid,
	"method" "payment_method",
	"amount_paise" bigint NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'requested' NOT NULL,
	"provider_refund_id" text,
	"reference" text,
	"requested_by" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_providerRefundId_unique" UNIQUE("provider_refund_id"),
	CONSTRAINT "refunds_amount" CHECK ("refunds"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"applies_to" "tax_target" NOT NULL,
	"label" text NOT NULL,
	"sac" text,
	"min_unit_paise" bigint DEFAULT 0 NOT NULL,
	"max_unit_paise" bigint,
	"rate_bps" integer NOT NULL,
	"starts_on" date NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_rules_rate" CHECK ("tax_rules"."rate_bps" between 0 and 2800),
	CONSTRAINT "tax_rules_band" CHECK ("tax_rules"."min_unit_paise" >= 0 and ("tax_rules"."max_unit_paise" is null or "tax_rules"."max_unit_paise" >= "tax_rules"."min_unit_paise"))
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"property_id" uuid,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	CONSTRAINT "webhook_events_provider_eventId_unique" UNIQUE("provider","event_id")
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "advance_percent" smallint DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "refund_approval_paise" bigint;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "state_code" text DEFAULT '27' NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "state_name" text DEFAULT 'Maharashtra' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "subtotal_paise" bigint;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tax_paise" bigint;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "refunded_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "manage_token_hash" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "consent" jsonb;--> statement-breakpoint
ALTER TABLE "cancellation_rules" ADD CONSTRAINT "cancellation_rules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_counters" ADD CONSTRAINT "invoice_counters_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "online_payments" ADD CONSTRAINT "online_payments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "online_payments" ADD CONSTRAINT "online_payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_online_payment_id_online_payments_id_fk" FOREIGN KEY ("online_payment_id") REFERENCES "public"."online_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_booking_id_index" ON "invoices" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "invoices_property_id_issued_on_index" ON "invoices" USING btree ("property_id","issued_on");--> statement-breakpoint
CREATE INDEX "online_payments_booking_id_index" ON "online_payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "online_payments_status_created_at_index" ON "online_payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "refunds_booking_id_index" ON "refunds" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "refunds_property_id_status_index" ON "refunds" USING btree ("property_id","status");--> statement-breakpoint
CREATE INDEX "tax_rules_property_id_applies_to_index" ON "tax_rules" USING btree ("property_id","applies_to");--> statement-breakpoint
CREATE INDEX "webhook_events_received_at_index" ON "webhook_events" USING btree ("received_at");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_manageTokenHash_unique" UNIQUE("manage_token_hash");--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_advance_percent" CHECK ("properties"."advance_percent" between 1 and 100);--> statement-breakpoint
-- Starting GST rules for every resort, from the rates in force since 22 September 2025.
-- The client's chartered accountant confirms them; staff change them in Settings.
INSERT INTO "tax_rules" ("property_id", "applies_to", "label", "sac", "min_unit_paise", "max_unit_paise", "rate_bps", "starts_on")
SELECT p."id", r."applies_to"::"tax_target", r."label", r."sac", r."min_unit_paise", r."max_unit_paise", r."rate_bps", DATE '2025-09-22'
FROM "properties" p
CROSS JOIN (VALUES
  ('room', 'Rooms up to ₹1,000 a night', '996311', 0, 100000, 0),
  ('room', 'Rooms from ₹1,000 to ₹7,500 a night', '996311', 100001, 750000, 500),
  ('room', 'Rooms above ₹7,500 a night', '996311', 750001, NULL, 1800),
  ('offering', 'Day packages, activities and meals', '999633', 0, NULL, 1800),
  ('addon', 'Add-ons', NULL, 0, NULL, 1800)
) AS r("applies_to", "label", "sac", "min_unit_paise", "max_unit_paise", "rate_bps");
--> statement-breakpoint
-- The cancellation rules each site publishes today. Valley publishes none, so its staff decide.
INSERT INTO "cancellation_rules" ("property_id", "applies_to", "days_before", "refund_percent")
SELECT p."id", 'any', 0, 0 FROM "properties" p WHERE p."code" IN ('KS', 'GC');
--> statement-breakpoint
INSERT INTO "cancellation_rules" ("property_id", "applies_to", "days_before", "refund_percent")
SELECT p."id", 'any', r."days", r."percent" FROM "properties" p
CROSS JOIN (VALUES (8, 100), (3, 50), (0, 0)) AS r("days", "percent")
WHERE p."code" = 'SB';
--> statement-breakpoint
-- Bookings made before GST was added keep their price as it was, with no GST in it.
UPDATE "bookings" SET "subtotal_paise" = "total_paise", "tax_paise" = 0 WHERE "total_paise" IS NOT NULL;
