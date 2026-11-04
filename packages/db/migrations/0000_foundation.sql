CREATE TYPE "public"."day_kind" AS ENUM('weekday', 'weekend', 'any');--> statement-breakpoint
CREATE TYPE "public"."meal_plan" AS ENUM('EP', 'CP', 'MAP', 'AP');--> statement-breakpoint
CREATE TYPE "public"."offering_kind" AS ENUM('day_package', 'activity', 'dining', 'other');--> statement-breakpoint
CREATE TYPE "public"."price_basis" AS ENUM('room', 'person');--> statement-breakpoint
CREATE TYPE "public"."room_category" AS ENUM('room', 'cottage', 'villa', 'tent', 'dormitory', 'other');--> statement-breakpoint
CREATE TYPE "public"."room_type_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."unit_status" AS ENUM('active', 'maintenance', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."booking_item_kind" AS ENUM('stay', 'offering');--> statement-breakpoint
CREATE TYPE "public"."booking_source" AS ENUM('website', 'admin', 'phone', 'walk_in', 'whatsapp', 'email', 'corporate', 'other');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending_payment', 'confirmed', 'part_paid', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'refunded', 'expired');--> statement-breakpoint
CREATE TYPE "public"."block_reason" AS ENUM('maintenance', 'owner_use', 'ota_allocation', 'wedding_buyout', 'other');--> statement-breakpoint
CREATE TYPE "public"."hold_status" AS ENUM('active', 'converted', 'released', 'expired');--> statement-breakpoint
CREATE TYPE "public"."inventory_action" AS ENUM('hold', 'release', 'book', 'cancel', 'block', 'unblock', 'capacity');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "age_bands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"min_age" smallint NOT NULL,
	"max_age" smallint NOT NULL,
	"free" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "age_bands_propertyId_code_unique" UNIQUE("property_id","code"),
	CONSTRAINT "age_bands_range" CHECK ("age_bands"."min_age" >= 0 and "age_bands"."max_age" >= "age_bands"."min_age")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"gstin" text,
	"address" text,
	"email" text,
	"phone" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"check_in_time" time DEFAULT '13:00' NOT NULL,
	"check_out_time" time DEFAULT '10:00' NOT NULL,
	"weekend_nights" smallint[] DEFAULT '{5,6}'::smallint[] NOT NULL,
	"hold_minutes" integer DEFAULT 15 NOT NULL,
	"low_stock_threshold" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_code_unique" UNIQUE("code"),
	CONSTRAINT "properties_code_format" CHECK ("properties"."code" ~ '^[A-Z]{2,4}$'),
	CONSTRAINT "properties_hold_minutes" CHECK ("properties"."hold_minutes" between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_pk" PRIMARY KEY("role_id","permission")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"built_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role_id" uuid NOT NULL,
	"all_properties" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"invited_by" text,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_properties" (
	"user_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	CONSTRAINT "staff_properties_user_id_property_id_pk" PRIMARY KEY("user_id","property_id")
);
--> statement-breakpoint
CREATE TABLE "date_rates" (
	"property_id" uuid NOT NULL,
	"room_type_id" uuid NOT NULL,
	"night" date NOT NULL,
	"base_paise" bigint NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "date_rates_room_type_id_night_pk" PRIMARY KEY("room_type_id","night"),
	CONSTRAINT "date_rates_money" CHECK ("date_rates"."base_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "offering_child_prices" (
	"offering_id" uuid NOT NULL,
	"age_band_id" uuid NOT NULL,
	"paise" bigint NOT NULL,
	CONSTRAINT "offering_child_prices_offering_id_age_band_id_pk" PRIMARY KEY("offering_id","age_band_id"),
	CONSTRAINT "offering_child_prices_money" CHECK ("offering_child_prices"."paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "offering_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"label" text NOT NULL,
	"starts_at" time,
	"ends_at" time,
	"default_capacity" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offering_slots_offeringId_label_unique" UNIQUE("offering_id","label"),
	CONSTRAINT "offering_slots_capacity" CHECK ("offering_slots"."default_capacity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"kind" "offering_kind" NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"adult_paise" bigint NOT NULL,
	"sold_on" smallint[],
	"valid_from" date,
	"valid_to" date,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offerings_propertyId_code_unique" UNIQUE("property_id","code"),
	CONSTRAINT "offerings_money" CHECK ("offerings"."adult_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "rate_child_prices" (
	"rate_id" uuid NOT NULL,
	"age_band_id" uuid NOT NULL,
	"paise" bigint NOT NULL,
	CONSTRAINT "rate_child_prices_rate_id_age_band_id_pk" PRIMARY KEY("rate_id","age_band_id"),
	CONSTRAINT "rate_child_prices_money" CHECK ("rate_child_prices"."paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_type_id" uuid NOT NULL,
	"season_id" uuid,
	"day_kind" "day_kind" DEFAULT 'any' NOT NULL,
	"basis" "price_basis" DEFAULT 'room' NOT NULL,
	"base_paise" bigint NOT NULL,
	"extra_adult_paise" bigint,
	"extra_bed_paise" bigint,
	"meal_plan" "meal_plan" DEFAULT 'EP' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rates_roomTypeId_seasonId_dayKind_unique" UNIQUE NULLS NOT DISTINCT("room_type_id","season_id","day_kind"),
	CONSTRAINT "rates_money" CHECK ("rates"."base_paise" >= 0 and coalesce("rates"."extra_adult_paise", 0) >= 0 and coalesce("rates"."extra_bed_paise", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" "room_category" DEFAULT 'room' NOT NULL,
	"base_occupancy" smallint DEFAULT 2 NOT NULL,
	"min_guests" smallint DEFAULT 1 NOT NULL,
	"max_adults" smallint NOT NULL,
	"max_children" smallint DEFAULT 0 NOT NULL,
	"max_guests" smallint NOT NULL,
	"extra_bed_allowed" boolean DEFAULT false NOT NULL,
	"size_sqft" integer,
	"bed_type" text,
	"status" "room_type_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_types_propertyId_code_unique" UNIQUE("property_id","code"),
	CONSTRAINT "room_types_guests" CHECK ("room_types"."base_occupancy" >= 1 and "room_types"."min_guests" >= 1 and "room_types"."max_guests" >= "room_types"."base_occupancy" and "room_types"."max_guests" >= "room_types"."min_guests" and "room_types"."max_adults" >= 1)
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_dates" CHECK ("seasons"."ends_on" >= "seasons"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "stay_rules" (
	"property_id" uuid NOT NULL,
	"room_type_id" uuid NOT NULL,
	"night" date NOT NULL,
	"stop_sell" boolean DEFAULT false NOT NULL,
	"min_nights" smallint,
	"max_nights" smallint,
	"closed_to_arrival" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stay_rules_room_type_id_night_pk" PRIMARY KEY("room_type_id","night"),
	CONSTRAINT "stay_rules_nights" CHECK (coalesce("stay_rules"."min_nights", 1) >= 1 and coalesce("stay_rules"."max_nights", 365) >= coalesce("stay_rules"."min_nights", 1))
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"block" text,
	"status" "unit_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_roomTypeId_name_unique" UNIQUE("room_type_id","name")
);
--> statement-breakpoint
CREATE TABLE "booking_counters" (
	"property_id" uuid NOT NULL,
	"year" smallint NOT NULL,
	"next" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "booking_counters_property_id_year_pk" PRIMARY KEY("property_id","year")
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"property_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"from_status" "booking_status",
	"to_status" "booking_status",
	"user_id" text,
	"note" text,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" "booking_item_kind" NOT NULL,
	"room_type_id" uuid,
	"unit_id" uuid,
	"offering_id" uuid,
	"slot_id" uuid,
	"party" jsonb NOT NULL,
	"extra_beds" smallint DEFAULT 0 NOT NULL,
	"amount_paise" bigint,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_items_kind" CHECK (("booking_items"."kind" = 'stay' and "booking_items"."room_type_id" is not null and "booking_items"."offering_id" is null)
        or ("booking_items"."kind" = 'offering' and "booking_items"."offering_id" is not null and "booking_items"."slot_id" is not null and "booking_items"."room_type_id" is null))
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"number" text NOT NULL,
	"status" "booking_status" DEFAULT 'pending_payment' NOT NULL,
	"source" "booking_source" NOT NULL,
	"guest_id" uuid NOT NULL,
	"check_in" date,
	"check_out" date,
	"visit_date" date,
	"total_paise" bigint,
	"paid_paise" bigint DEFAULT 0 NOT NULL,
	"quote" jsonb,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_number_unique" UNIQUE("number"),
	CONSTRAINT "bookings_dates" CHECK ("bookings"."check_out" is null or "bookings"."check_out" > "bookings"."check_in"),
	CONSTRAINT "bookings_money" CHECK (coalesce("bookings"."total_paise", 0) >= 0 and "bookings"."paid_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"company_name" text,
	"company_gstin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_type_id" uuid,
	"unit_id" uuid,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"reason" "block_reason" NOT NULL,
	"note" text,
	"lifted_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_dates" CHECK ("blocks"."ends_on" >= "blocks"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "capacity_days" (
	"property_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"day" date NOT NULL,
	"capacity" integer NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	"held" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capacity_days_slot_id_day_pk" PRIMARY KEY("slot_id","day"),
	CONSTRAINT "capacity_days_counts" CHECK ("capacity_days"."sold" >= 0 and "capacity_days"."held" >= 0 and "capacity_days"."sold" + "capacity_days"."held" <= "capacity_days"."capacity")
);
--> statement-breakpoint
CREATE TABLE "capacity_holds" (
	"hold_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"day" date NOT NULL,
	"guests" integer NOT NULL,
	CONSTRAINT "capacity_holds_hold_id_slot_id_day_pk" PRIMARY KEY("hold_id","slot_id","day"),
	CONSTRAINT "capacity_holds_guests" CHECK ("capacity_holds"."guests" > 0)
);
--> statement-breakpoint
CREATE TABLE "holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"status" "hold_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"quote" jsonb,
	"booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"property_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" "inventory_action" NOT NULL,
	"unit_id" uuid,
	"slot_id" uuid,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"hold_id" uuid,
	"booking_id" uuid,
	"block_id" uuid,
	"user_id" text,
	"reason" text,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "unit_nights" (
	"property_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"night" date NOT NULL,
	"hold_id" uuid,
	"booking_id" uuid,
	"block_id" uuid,
	CONSTRAINT "unit_nights_unit_id_night_pk" PRIMARY KEY("unit_id","night"),
	CONSTRAINT "unit_nights_one_owner" CHECK (num_nonnulls("unit_nights"."hold_id", "unit_nights"."booking_id", "unit_nights"."block_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"property_id" uuid,
	"ip" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "age_bands" ADD CONSTRAINT "age_bands_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_properties" ADD CONSTRAINT "staff_properties_user_id_staff_members_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_members"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_properties" ADD CONSTRAINT "staff_properties_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_rates" ADD CONSTRAINT "date_rates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_rates" ADD CONSTRAINT "date_rates_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offering_child_prices" ADD CONSTRAINT "offering_child_prices_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offering_child_prices" ADD CONSTRAINT "offering_child_prices_age_band_id_age_bands_id_fk" FOREIGN KEY ("age_band_id") REFERENCES "public"."age_bands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offering_slots" ADD CONSTRAINT "offering_slots_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offering_slots" ADD CONSTRAINT "offering_slots_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_child_prices" ADD CONSTRAINT "rate_child_prices_rate_id_rates_id_fk" FOREIGN KEY ("rate_id") REFERENCES "public"."rates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_child_prices" ADD CONSTRAINT "rate_child_prices_age_band_id_age_bands_id_fk" FOREIGN KEY ("age_band_id") REFERENCES "public"."age_bands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_rules" ADD CONSTRAINT "stay_rules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_rules" ADD CONSTRAINT "stay_rules_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_counters" ADD CONSTRAINT "booking_counters_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_slot_id_offering_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."offering_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_days" ADD CONSTRAINT "capacity_days_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_days" ADD CONSTRAINT "capacity_days_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_days" ADD CONSTRAINT "capacity_days_slot_id_offering_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."offering_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_holds" ADD CONSTRAINT "capacity_holds_hold_id_holds_id_fk" FOREIGN KEY ("hold_id") REFERENCES "public"."holds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_holds" ADD CONSTRAINT "capacity_holds_slot_id_offering_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."offering_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_nights" ADD CONSTRAINT "unit_nights_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_nights" ADD CONSTRAINT "unit_nights_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_nights" ADD CONSTRAINT "unit_nights_hold_id_holds_id_fk" FOREIGN KEY ("hold_id") REFERENCES "public"."holds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_nights" ADD CONSTRAINT "unit_nights_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_nights" ADD CONSTRAINT "unit_nights_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "units_property_id_index" ON "units" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "booking_events_booking_id_at_index" ON "booking_events" USING btree ("booking_id","at");--> statement-breakpoint
CREATE INDEX "booking_items_booking_id_index" ON "booking_items" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_property_id_check_in_index" ON "bookings" USING btree ("property_id","check_in");--> statement-breakpoint
CREATE INDEX "bookings_property_id_visit_date_index" ON "bookings" USING btree ("property_id","visit_date");--> statement-breakpoint
CREATE INDEX "bookings_property_id_status_index" ON "bookings" USING btree ("property_id","status");--> statement-breakpoint
CREATE INDEX "bookings_guest_id_index" ON "bookings" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guests_phone_index" ON "guests" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "guests_email_index" ON "guests" USING btree ("email");--> statement-breakpoint
CREATE INDEX "capacity_days_property_id_day_index" ON "capacity_days" USING btree ("property_id","day");--> statement-breakpoint
CREATE INDEX "capacity_holds_slot_id_day_index" ON "capacity_holds" USING btree ("slot_id","day");--> statement-breakpoint
CREATE INDEX "holds_status_expires_at_index" ON "holds" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "inventory_log_property_id_from_date_index" ON "inventory_log" USING btree ("property_id","from_date");--> statement-breakpoint
CREATE INDEX "inventory_log_unit_id_from_date_index" ON "inventory_log" USING btree ("unit_id","from_date");--> statement-breakpoint
CREATE INDEX "unit_nights_property_id_night_index" ON "unit_nights" USING btree ("property_id","night");--> statement-breakpoint
CREATE INDEX "unit_nights_hold_id_index" ON "unit_nights" USING btree ("hold_id");--> statement-breakpoint
CREATE INDEX "unit_nights_booking_id_index" ON "unit_nights" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "unit_nights_block_id_index" ON "unit_nights" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "audit_log_property_id_at_index" ON "audit_log" USING btree ("property_id","at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_entity_id_index" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_id_at_index" ON "audit_log" USING btree ("user_id","at");