CREATE TYPE "public"."payment_method" AS ENUM('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other');--> statement-breakpoint
ALTER TYPE "public"."booking_source" ADD VALUE 'travel_agent' BEFORE 'corporate';--> statement-breakpoint
CREATE TABLE "offline_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_paise" bigint NOT NULL,
	"reference" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offline_payments_amount" CHECK ("offline_payments"."amount_paise" > 0)
);
--> statement-breakpoint
ALTER TABLE "offline_payments" ADD CONSTRAINT "offline_payments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_payments" ADD CONSTRAINT "offline_payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offline_payments_booking_id_index" ON "offline_payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "offline_payments_property_id_received_at_index" ON "offline_payments" USING btree ("property_id","received_at");