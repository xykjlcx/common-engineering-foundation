ALTER TABLE "session" ADD COLUMN "public_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_public_id_unique" UNIQUE("public_id");