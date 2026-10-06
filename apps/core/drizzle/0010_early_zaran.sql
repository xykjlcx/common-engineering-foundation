CREATE TABLE "stored_file" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"purpose" text DEFAULT 'avatar' NOT NULL,
	"status" text DEFAULT 'staging' NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"staged_at" timestamp with time zone,
	"bound_at" timestamp with time zone,
	"bound_user_id" uuid,
	CONSTRAINT "stored_file_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "stored_file_purpose_check" CHECK ("stored_file"."purpose" = 'avatar'),
	CONSTRAINT "stored_file_status_check" CHECK ("stored_file"."status" IN ('staging', 'staged', 'bound', 'failed')),
	CONSTRAINT "stored_file_size_check" CHECK ("stored_file"."byte_size" > 0 AND "stored_file"."byte_size" <= 2097152),
	CONSTRAINT "stored_file_binding_check" CHECK (("stored_file"."status" = 'bound') = ("stored_file"."bound_user_id" IS NOT NULL AND "stored_file"."bound_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "avatar_id" uuid;--> statement-breakpoint
CREATE INDEX "stored_file_owner_idx" ON "stored_file" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_avatar_id_stored_file_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."stored_file"("id") ON DELETE restrict ON UPDATE no action;