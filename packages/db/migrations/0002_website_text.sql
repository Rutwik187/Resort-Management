ALTER TABLE "room_types" DROP CONSTRAINT "room_types_guests";--> statement-breakpoint
ALTER TABLE "room_types" ALTER COLUMN "max_adults" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "room_types" ALTER COLUMN "max_guests" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "features" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "web_group" text;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "on_website" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_guests" CHECK ("room_types"."base_occupancy" >= 1 and "room_types"."min_guests" >= 1 and ("room_types"."max_guests" is null or ("room_types"."max_guests" >= "room_types"."base_occupancy" and "room_types"."max_guests" >= "room_types"."min_guests")) and ("room_types"."max_adults" is null or "room_types"."max_adults" >= 1));