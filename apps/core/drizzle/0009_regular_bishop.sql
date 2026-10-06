CREATE TABLE "dept" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "data_scope" text DEFAULT 'self' NOT NULL;--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "dept_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "dept_id" uuid;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "manager_id" uuid;--> statement-breakpoint
ALTER TABLE "dept" ADD CONSTRAINT "dept_parent_id_dept_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dept"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dept_parent_idx" ON "dept" USING btree ("parent_id");--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_dept_id_dept_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."dept"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_manager_id_app_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_user_dept_idx" ON "app_user" USING btree ("dept_id");--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_data_scope_check" CHECK ("role"."data_scope" in ('all', 'self', 'dept', 'deptAndChildren', 'custom'));--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_manager_not_self" CHECK ("app_user"."manager_id" IS NULL OR "app_user"."manager_id" <> "app_user"."id");