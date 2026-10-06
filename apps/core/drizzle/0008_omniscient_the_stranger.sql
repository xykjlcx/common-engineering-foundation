ALTER TABLE "app_user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "employee_no" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "position" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "employment_type" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "employment_status" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "joined_at" date;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "work_location" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "remark" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "effective_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_employee_no_unique" UNIQUE("employee_no");--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_employment_status_check" CHECK ("app_user"."employment_status" IS NULL OR "app_user"."employment_status" IN ('probation', 'active', 'left'));--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_gender_check" CHECK ("app_user"."gender" IS NULL OR "app_user"."gender" IN ('male', 'female', 'other'));