CREATE TABLE "guest_profiles" (
	"key" text PRIMARY KEY NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"note" text,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"removed_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
