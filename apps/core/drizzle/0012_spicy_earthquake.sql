CREATE TABLE "user_filter_scheme" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"filters" text NOT NULL,
	"scope" text DEFAULT 'mine' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_scheme_scope_check" CHECK ("user_filter_scheme"."scope" IN ('mine', 'shared'))
);
--> statement-breakpoint
ALTER TABLE "user_filter_scheme" ADD CONSTRAINT "user_filter_scheme_owner_id_app_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_scheme_owner_name_idx" ON "user_filter_scheme" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "login_event_user_success_time_idx" ON "login_event" USING btree ("user_id","occurred_at") WHERE "login_event"."outcome" = 'success';