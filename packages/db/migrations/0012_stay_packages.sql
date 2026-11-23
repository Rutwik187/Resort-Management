CREATE TYPE "public"."package_basis" AS ENUM('person', 'couple', 'room');--> statement-breakpoint
CREATE TYPE "public"."package_price_unit" AS ENUM('stay', 'night');--> statement-breakpoint
CREATE TYPE "public"."stay_package_kind" AS ENUM('stay', 'staycation', 'custom');--> statement-breakpoint
CREATE TABLE "stay_package_child_prices" (
	"package_id" uuid NOT NULL,
	"age_band_id" uuid NOT NULL,
	"paise" bigint NOT NULL,
	CONSTRAINT "stay_package_child_prices_package_id_age_band_id_pk" PRIMARY KEY("package_id","age_band_id"),
	CONSTRAINT "stay_package_child_prices_money" CHECK ("stay_package_child_prices"."paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stay_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"kind" "stay_package_kind" DEFAULT 'stay' NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"inclusions" text[] DEFAULT '{}'::text[] NOT NULL,
	"exclusions" text[] DEFAULT '{}'::text[] NOT NULL,
	"meal_plan" "meal_plan" DEFAULT 'AP' NOT NULL,
	"room_type_ids" uuid[] NOT NULL,
	"nights" smallint,
	"min_nights" smallint,
	"max_nights" smallint,
	"basis" "package_basis" DEFAULT 'couple' NOT NULL,
	"price_unit" "package_price_unit" DEFAULT 'stay' NOT NULL,
	"price_paise" bigint NOT NULL,
	"extra_adult_paise" bigint,
	"arrival_days" smallint[],
	"valid_from" date,
	"valid_to" date,
	"blackout_dates" date[] DEFAULT '{}'::date[] NOT NULL,
	"capacity_per_day" integer,
	"cancellation_note" text,
	"featured" boolean DEFAULT false NOT NULL,
	"on_website" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stay_packages_propertyId_code_unique" UNIQUE("property_id","code"),
	CONSTRAINT "stay_packages_money" CHECK ("stay_packages"."price_paise" >= 0 and ("stay_packages"."extra_adult_paise" is null or "stay_packages"."extra_adult_paise" >= 0)),
	CONSTRAINT "stay_packages_nights" CHECK (("stay_packages"."nights" is null or "stay_packages"."nights" between 1 and 30) and ("stay_packages"."min_nights" is null or "stay_packages"."max_nights" is null or "stay_packages"."max_nights" >= "stay_packages"."min_nights")),
	CONSTRAINT "stay_packages_dates" CHECK ("stay_packages"."valid_to" is null or "stay_packages"."valid_from" is null or "stay_packages"."valid_to" >= "stay_packages"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "booking_items" ADD COLUMN "package_id" uuid;--> statement-breakpoint
ALTER TABLE "stay_package_child_prices" ADD CONSTRAINT "stay_package_child_prices_package_id_stay_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."stay_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_package_child_prices" ADD CONSTRAINT "stay_package_child_prices_age_band_id_age_bands_id_fk" FOREIGN KEY ("age_band_id") REFERENCES "public"."age_bands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_packages" ADD CONSTRAINT "stay_packages_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_package_id_stay_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."stay_packages"("id") ON DELETE no action ON UPDATE no action;