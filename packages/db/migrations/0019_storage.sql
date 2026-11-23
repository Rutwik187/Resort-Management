CREATE TABLE "content_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"key" text NOT NULL,
	"draft_text" text,
	"draft_image_url" text,
	"draft_image_alt" text,
	"published_text" text,
	"published_image_url" text,
	"published_image_alt" text,
	"published_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_slots_propertyId_key_unique" UNIQUE("property_id","key")
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"category" text NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"caption" text,
	"featured" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_items_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
CREATE TABLE "id_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"label" text NOT NULL,
	"pathname" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delete_after" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "id_proofs_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "id_proof_retention_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "content_slots" ADD CONSTRAINT "content_slots_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_proofs" ADD CONSTRAINT "id_proofs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_proofs" ADD CONSTRAINT "id_proofs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_items_property_id_category_sort_order_index" ON "gallery_items" USING btree ("property_id","category","sort_order");--> statement-breakpoint
CREATE INDEX "id_proofs_booking_id_index" ON "id_proofs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "id_proofs_delete_after_index" ON "id_proofs" USING btree ("delete_after");--> statement-breakpoint
-- ID proofs (ADM-08) are seen only by Front Desk, the Property Manager and the Super Admin, as in packages/db/src/access.ts.
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT "id", 'id_proofs.manage' FROM "roles" WHERE "key" IN ('super_admin', 'property_manager', 'front_desk')
ON CONFLICT DO NOTHING;
