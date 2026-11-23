ALTER TYPE "public"."lead_interest" ADD VALUE 'corporate' BEFORE 'event';--> statement-breakpoint
ALTER TYPE "public"."lead_source" ADD VALUE 'meta_ads' BEFORE 'phone';--> statement-breakpoint
ALTER TYPE "public"."lead_source" ADD VALUE 'google_ads' BEFORE 'phone';--> statement-breakpoint
ALTER TYPE "public"."lead_status" ADD VALUE 'site_visit_scheduled' BEFORE 'quoted';--> statement-breakpoint
ALTER TYPE "public"."lead_status" ADD VALUE 'site_visit_done' BEFORE 'quoted';--> statement-breakpoint
ALTER TYPE "public"."lead_status" ADD VALUE 'negotiation' BEFORE 'won';--> statement-breakpoint
CREATE TABLE "lead_assignment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"interest" "lead_interest",
	"user_ids" text[] NOT NULL,
	"next_index" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_assignment_rules_propertyId_interest_unique" UNIQUE NULLS NOT DISTINCT("property_id","interest")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "follow_up_time" time;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "budget" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "estimated_value_paise" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "advance_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "campaign" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent" jsonb;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "lead_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_assignment_rules" ADD CONSTRAINT "lead_assignment_rules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_lead_id_index" ON "messages" USING btree ("lead_id");