-- 旧生命周期值先转为独立账号/人员状态；在同一迁移事务保留原始事实，不猜操作者。
ALTER TABLE "user_role" ADD COLUMN "granted_by" uuid;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_granted_by_app_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "audit_log" ("id", "actor_user_id", "action", "outcome", "object_type", "object_id", "before", "after", "trace_id", "created_at")
SELECT gen_random_uuid(), NULL, 'user.migrateLegacyStatus', 'success', 'user', "id"::text,
  jsonb_build_object('status', "status", 'employmentStatus', "employment_status"),
  jsonb_build_object('status', 'disabled', 'employmentStatus', CASE WHEN "status" = 'left' THEN 'left' ELSE "employment_status" END),
  'migration:0015', CURRENT_TIMESTAMP
FROM "app_user" WHERE "status" IN ('unactivated', 'left');--> statement-breakpoint
UPDATE "app_user" SET "employment_status" = CASE WHEN "status" = 'left' THEN 'left' ELSE "employment_status" END,
  "status" = 'disabled'
WHERE "status" IN ('unactivated', 'left');--> statement-breakpoint
ALTER TABLE "app_user" DROP CONSTRAINT "app_user_status_check";--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_status_check" CHECK ("app_user"."status" in ('active', 'disabled'));
