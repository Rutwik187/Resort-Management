CREATE TABLE "job_runs" (
	"name" text PRIMARY KEY NOT NULL,
	"locked_until" timestamp with time zone,
	"last_started_at" timestamp with time zone,
	"last_finished_at" timestamp with time zone,
	"last_result" jsonb,
	"last_error" text
);
