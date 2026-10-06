ALTER TABLE "dept" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "dept" ADD COLUMN "leader_id" uuid;--> statement-breakpoint
ALTER TABLE "dept" ADD COLUMN "headcount" integer;--> statement-breakpoint
ALTER TABLE "dept" ADD CONSTRAINT "dept_leader_id_app_user_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dept_leader_idx" ON "dept" USING btree ("leader_id");--> statement-breakpoint
ALTER TABLE "dept" ADD CONSTRAINT "dept_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "dept" ADD CONSTRAINT "dept_code_check" CHECK ("dept"."code" IS NULL OR ("dept"."code" = btrim("dept"."code") AND char_length("dept"."code") BETWEEN 1 AND 32));--> statement-breakpoint
ALTER TABLE "dept" ADD CONSTRAINT "dept_headcount_check" CHECK ("dept"."headcount" IS NULL OR "dept"."headcount" >= 0);