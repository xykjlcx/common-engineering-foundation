CREATE TABLE "message_preference" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"badge_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_message" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipient_id" uuid NOT NULL,
	"notice_id" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"sender_name" text NOT NULL,
	"severity" text DEFAULT 'normal' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"require_confirmation" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"first_read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "message_kind_check" CHECK ("inbox_message"."kind" IN ('system', 'announcement')),
	CONSTRAINT "message_severity_check" CHECK ("inbox_message"."severity" IN ('normal', 'important', 'urgent')),
	CONSTRAINT "message_source_check" CHECK (("inbox_message"."kind" = 'system' AND "inbox_message"."notice_id" IS NULL) OR ("inbox_message"."kind" = 'announcement' AND "inbox_message"."notice_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "notice" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"severity" text DEFAULT 'normal' NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"audience_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"require_confirmation" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"publisher_id" uuid,
	"publisher_name" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	CONSTRAINT "notice_status_check" CHECK ("notice"."status" in ('draft', 'scheduled', 'published', 'withdrawn')),
	CONSTRAINT "notice_severity_check" CHECK ("notice"."severity" in ('normal', 'important', 'urgent')),
	CONSTRAINT "notice_audience_check" CHECK ("notice"."audience" in ('all', 'departments', 'roles')),
	CONSTRAINT "notice_title_check" CHECK (char_length(btrim("notice"."title")) BETWEEN 1 AND 120),
	CONSTRAINT "notice_content_check" CHECK (char_length(btrim("notice"."content")) BETWEEN 1 AND 20000),
	CONSTRAINT "notice_version_check" CHECK ("notice"."version" >= 0),
	CONSTRAINT "notice_targets_check" CHECK (("notice"."audience" = 'all' AND cardinality("notice"."audience_ids") = 0) OR ("notice"."audience" <> 'all' AND cardinality("notice"."audience_ids") BETWEEN 1 AND 500)),
	CONSTRAINT "notice_schedule_check" CHECK (("notice"."status" = 'scheduled') = ("notice"."scheduled_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "message_preference" ADD CONSTRAINT "message_preference_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_message" ADD CONSTRAINT "inbox_message_recipient_id_app_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_message" ADD CONSTRAINT "inbox_message_notice_id_notice_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice" ADD CONSTRAINT "notice_publisher_id_app_user_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_recipient_created_idx" ON "inbox_message" USING btree ("recipient_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_notice_recipient_idx" ON "inbox_message" USING btree ("notice_id","recipient_id");--> statement-breakpoint
CREATE INDEX "notice_schedule_idx" ON "notice" USING btree ("status","scheduled_at");