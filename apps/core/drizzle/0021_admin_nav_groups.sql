INSERT INTO menu (id, catalog_identity, type, subsystem_key, label, sort, created_at, updated_at)
SELECT 'e77751c5-5d9b-55c7-a4a1-c9edce4fab39', 'admin#dir:organization', 'dir', 'admin', '{"zh-CN": "组织与账号", "en-US": "Organization & accounts"}'::jsonb, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM menu WHERE catalog_identity IN ('/_auth/admin/users/#page', '/_auth/admin/depts#page') AND parent_id IS NULL)
ON CONFLICT (catalog_identity) DO NOTHING;
--> statement-breakpoint
UPDATE menu SET parent_id = (SELECT id FROM menu WHERE catalog_identity = 'admin#dir:organization'), version = version + 1, updated_at = CURRENT_TIMESTAMP
WHERE catalog_identity IN ('/_auth/admin/users/#page', '/_auth/admin/depts#page') AND parent_id IS NULL;
--> statement-breakpoint

INSERT INTO menu (id, catalog_identity, type, subsystem_key, label, sort, created_at, updated_at)
SELECT '14f79652-5cee-538a-a9cc-fad99f53cf25', 'admin#dir:permissions', 'dir', 'admin', '{"zh-CN": "权限", "en-US": "Permissions"}'::jsonb, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM menu WHERE catalog_identity IN ('/_auth/admin/roles#page', '/_auth/admin/menus#page') AND parent_id IS NULL)
ON CONFLICT (catalog_identity) DO NOTHING;
--> statement-breakpoint
UPDATE menu SET parent_id = (SELECT id FROM menu WHERE catalog_identity = 'admin#dir:permissions'), version = version + 1, updated_at = CURRENT_TIMESTAMP
WHERE catalog_identity IN ('/_auth/admin/roles#page', '/_auth/admin/menus#page') AND parent_id IS NULL;
--> statement-breakpoint

INSERT INTO menu (id, catalog_identity, type, subsystem_key, label, sort, created_at, updated_at)
SELECT 'ba458d20-e235-5ebc-b754-9317bb134f25', 'admin#dir:examples', 'dir', 'admin', '{"zh-CN": "示例", "en-US": "Examples"}'::jsonb, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM menu WHERE catalog_identity IN ('/_auth/admin/countries#page', '/_auth/admin/teams#page') AND parent_id IS NULL)
ON CONFLICT (catalog_identity) DO NOTHING;
--> statement-breakpoint
UPDATE menu SET parent_id = (SELECT id FROM menu WHERE catalog_identity = 'admin#dir:examples'), version = version + 1, updated_at = CURRENT_TIMESTAMP
WHERE catalog_identity IN ('/_auth/admin/countries#page', '/_auth/admin/teams#page') AND parent_id IS NULL;
