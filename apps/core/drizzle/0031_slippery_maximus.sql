ALTER TABLE "dept" ADD COLUMN "kind" text DEFAULT 'department' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dept_root_company_unique" ON "dept" USING btree ("kind") WHERE "dept"."parent_id" IS NULL AND "dept"."kind" = 'company';--> statement-breakpoint
ALTER TABLE "dept" ADD CONSTRAINT "dept_kind_check" CHECK ("dept"."kind" IN ('company', 'department'));