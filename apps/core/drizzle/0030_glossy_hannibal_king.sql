CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"values" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
