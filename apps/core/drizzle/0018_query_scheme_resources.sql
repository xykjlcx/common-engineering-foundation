DROP INDEX "user_scheme_owner_name_idx";--> statement-breakpoint
ALTER TABLE "user_filter_scheme" ADD COLUMN "resource" text DEFAULT 'users' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_scheme_owner_name_idx" ON "user_filter_scheme" USING btree ("owner_id","resource","name");