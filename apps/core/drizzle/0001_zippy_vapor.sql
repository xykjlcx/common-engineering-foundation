ALTER TABLE "audit_log" ADD COLUMN "outcome" text DEFAULT 'success' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "error_code" text;