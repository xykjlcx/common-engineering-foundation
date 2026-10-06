CREATE TABLE "role_dept" (
	"role_id" uuid NOT NULL,
	"dept_id" uuid NOT NULL,
	CONSTRAINT "role_dept_role_id_dept_id_pk" PRIMARY KEY("role_id","dept_id")
);
--> statement-breakpoint
ALTER TABLE "role_dept" ADD CONSTRAINT "role_dept_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_dept" ADD CONSTRAINT "role_dept_dept_id_dept_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."dept"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "role_dept_dept_idx" ON "role_dept" USING btree ("dept_id");--> statement-breakpoint
-- 不过滤旧引用；非法值、空值或悬空部门必须使整笔迁移回滚。
INSERT INTO "role_dept" ("role_id", "dept_id")
SELECT DISTINCT "role"."id", reference."dept_id"::uuid
FROM "role"
CROSS JOIN LATERAL jsonb_array_elements_text("role"."dept_ids") AS reference("dept_id");--> statement-breakpoint
ALTER TABLE "role" DROP COLUMN "dept_ids";
