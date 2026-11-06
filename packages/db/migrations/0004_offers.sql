CREATE TYPE "public"."discount_kind" AS ENUM('percent', 'amount', 'none');--> statement-breakpoint
CREATE TYPE "public"."offer_scope" AS ENUM('stay', 'day', 'any');--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"code" text,
	"discount_kind" "discount_kind" DEFAULT 'none' NOT NULL,
	"discount_value" bigint,
	"applies_to" "offer_scope" DEFAULT 'any' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"min_nights" smallint,
	"on_website" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_propertyId_code_unique" UNIQUE("property_id","code"),
	CONSTRAINT "offers_discount" CHECK (("offers"."discount_kind" = 'none' and "offers"."discount_value" is null) or ("offers"."discount_kind" = 'percent' and "offers"."discount_value" between 1 and 100) or ("offers"."discount_kind" = 'amount' and "offers"."discount_value" > 0)),
	CONSTRAINT "offers_dates" CHECK ("offers"."ends_on" is null or "offers"."starts_on" is null or "offers"."ends_on" >= "offers"."starts_on")
);
--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;