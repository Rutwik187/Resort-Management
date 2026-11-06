CREATE TYPE "public"."lead_interest" AS ENUM('stay', 'day', 'wedding', 'event', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('website_booking', 'website_enquiry', 'phone', 'walk_in', 'whatsapp', 'email', 'referral', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'quoted', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lead_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"type" text NOT NULL,
	"note" text,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"source" "lead_source" NOT NULL,
	"interest" "lead_interest" DEFAULT 'stay' NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"date_from" date,
	"date_to" date,
	"guests" smallint,
	"message" text,
	"request" jsonb,
	"assigned_to" text,
	"follow_up_on" date,
	"booking_id" uuid,
	"lost_reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_activities_lead_id_at_index" ON "lead_activities" USING btree ("lead_id","at");--> statement-breakpoint
CREATE INDEX "leads_property_id_status_created_at_index" ON "leads" USING btree ("property_id","status","created_at");--> statement-breakpoint
CREATE INDEX "leads_property_id_follow_up_on_index" ON "leads" USING btree ("property_id","follow_up_on");--> statement-breakpoint
CREATE INDEX "leads_phone_index" ON "leads" USING btree ("phone");