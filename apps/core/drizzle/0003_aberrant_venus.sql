CREATE TABLE "login_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"user_id" uuid,
	"outcome" text NOT NULL,
	"reason" text,
	"ip" text,
	"ua" text,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_system_admin" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "app_user_username_unique" UNIQUE("username"),
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "login_event_username_time_idx" ON "login_event" USING btree ("username","occurred_at");--> statement-breakpoint
CREATE INDEX "login_event_ip_time_idx" ON "login_event" USING btree ("ip","occurred_at");--> statement-breakpoint
CREATE INDEX "app_user_status_idx" ON "app_user" USING btree ("status");