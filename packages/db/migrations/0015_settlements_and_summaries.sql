ALTER TABLE "properties" ADD COLUMN "report_emails" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "online_payments" ADD COLUMN "fee_paise" bigint;--> statement-breakpoint
ALTER TABLE "online_payments" ADD COLUMN "fee_tax_paise" bigint;--> statement-breakpoint
ALTER TABLE "online_payments" ADD COLUMN "settlement_id" text;--> statement-breakpoint
ALTER TABLE "online_payments" ADD COLUMN "settled_at" timestamp with time zone;