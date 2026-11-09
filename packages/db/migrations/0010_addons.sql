CREATE TYPE "public"."addon_basis" AS ENUM('unit', 'person', 'night');--> statement-breakpoint
CREATE TYPE "public"."addon_sold_with" AS ENUM('stay', 'day', 'both');--> statement-breakpoint
ALTER TYPE "public"."booking_item_kind" ADD VALUE 'addon';--> statement-breakpoint
CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"basis" "addon_basis" NOT NULL,
	"price_paise" bigint NOT NULL,
	"sold_with" "addon_sold_with" DEFAULT 'both' NOT NULL,
	"max_quantity" smallint DEFAULT 10 NOT NULL,
	"on_website" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addons_propertyId_code_unique" UNIQUE("property_id","code"),
	CONSTRAINT "addons_money" CHECK ("addons"."price_paise" >= 0),
	CONSTRAINT "addons_quantity" CHECK ("addons"."max_quantity" between 1 and 100),
	CONSTRAINT "addons_night_is_stay" CHECK ("addons"."basis" <> 'night' or "addons"."sold_with" = 'stay')
);
--> statement-breakpoint
ALTER TABLE "booking_items" DROP CONSTRAINT "booking_items_kind";--> statement-breakpoint
ALTER TABLE "booking_items" ADD COLUMN "addon_id" uuid;--> statement-breakpoint
ALTER TABLE "booking_items" ADD COLUMN "quantity" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "addons" ADD CONSTRAINT "addons_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_kind" CHECK (("booking_items"."kind"::text = 'stay' and "booking_items"."room_type_id" is not null and "booking_items"."offering_id" is null and "booking_items"."addon_id" is null)
        or ("booking_items"."kind"::text = 'offering' and "booking_items"."offering_id" is not null and "booking_items"."slot_id" is not null and "booking_items"."room_type_id" is null and "booking_items"."addon_id" is null)
        or ("booking_items"."kind"::text = 'addon' and "booking_items"."addon_id" is not null and "booking_items"."room_type_id" is null and "booking_items"."offering_id" is null and "booking_items"."quantity" >= 1));