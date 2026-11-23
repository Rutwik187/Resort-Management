CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_propertyId_fromPath_unique" UNIQUE("property_id","from_path")
);
--> statement-breakpoint
CREATE TABLE "request_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"google_id" text NOT NULL,
	"author" text NOT NULL,
	"author_url" text,
	"photo_url" text,
	"rating" smallint NOT NULL,
	"text" text,
	"reviewed_at" timestamp with time zone,
	"featured" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_propertyId_googleId_unique" UNIQUE("property_id","google_id")
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "google_place_id" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "google_rating" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "google_review_count" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "reviews_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "redirects" ADD CONSTRAINT "redirects_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_property_id_reviewed_at_index" ON "reviews" USING btree ("property_id","reviewed_at");