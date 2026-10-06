CREATE TABLE "team" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "team_name_unique" UNIQUE("name"),
	CONSTRAINT "team_code_unique" UNIQUE("code"),
	CONSTRAINT "team_code_check" CHECK ("team"."code" IS NULL OR ("team"."code" = btrim("team"."code") AND char_length("team"."code") BETWEEN 1 AND 32))
);
