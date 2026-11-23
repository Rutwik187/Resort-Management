CREATE TYPE "public"."offer_kind" AS ENUM('standard', 'early_bird', 'last_minute', 'long_stay', 'festival');--> statement-breakpoint
CREATE TABLE "offer_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"day" date NOT NULL,
	"offer_id" uuid NOT NULL,
	"quantity" integer,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_days_propertyId_day_unique" UNIQUE("property_id","day"),
	CONSTRAINT "offer_days_quantity" CHECK ("offer_days"."quantity" is null or "offer_days"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "offer_uses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"property_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"guest_key" text,
	"code" text,
	"discount_paise" bigint NOT NULL,
	"offer_day" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_uses_bookingId_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "discount_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "campaign" jsonb;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "kind" "offer_kind" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "book_from" date;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "book_to" date;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "min_days_ahead" smallint;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "max_days_ahead" smallint;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "weekdays" smallint[];--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "room_type_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "offering_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "free_nights" smallint;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "max_uses" integer;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "max_uses_per_guest" integer;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "min_amount_paise" bigint;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "show_code" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_days" ADD CONSTRAINT "offer_days_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_days" ADD CONSTRAINT "offer_days_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_uses" ADD CONSTRAINT "offer_uses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_uses" ADD CONSTRAINT "offer_uses_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_uses" ADD CONSTRAINT "offer_uses_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offer_uses_offer_id_index" ON "offer_uses" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "offer_uses_offer_id_guest_key_index" ON "offer_uses" USING btree ("offer_id","guest_key");--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_book_dates" CHECK ("offers"."book_to" is null or "offers"."book_from" is null or "offers"."book_to" >= "offers"."book_from");