CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"channel" "message_channel" DEFAULT 'email' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_templates_propertyId_kind_channel_unique" UNIQUE("property_id","kind","channel")
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "team_emails" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "review_url" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "maps_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivery" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivery_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;