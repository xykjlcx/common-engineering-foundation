CREATE TABLE "job_run" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_key" text NOT NULL,
	"trigger" text NOT NULL,
	"attempt" integer NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"message" text NOT NULL,
	CONSTRAINT "job_run_trigger_check" CHECK ("job_run"."trigger" in ('scheduled', 'manual', 'retry')),
	CONSTRAINT "job_run_status_check" CHECK ("job_run"."status" in ('success', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "scheduled_job" (
	"key" text PRIMARY KEY NOT NULL,
	"cron" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 0 NOT NULL,
	"retry_delay_minutes" integer DEFAULT 5 NOT NULL,
	"timeout_seconds" integer DEFAULT 60 NOT NULL,
	"next_run_at" timestamp with time zone,
	"retry_at" timestamp with time zone,
	"retry_attempt" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_run" ADD CONSTRAINT "job_run_job_key_scheduled_job_key_fk" FOREIGN KEY ("job_key") REFERENCES "public"."scheduled_job"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_run_key_started_idx" ON "job_run" USING btree ("job_key","started_at");