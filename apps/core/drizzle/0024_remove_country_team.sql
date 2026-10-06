DO $$
DECLARE unexpected_children text;
BEGIN
  SELECT string_agg(child.id::text || ' (parent=' || child.parent_id::text || ')', ', ')
  INTO unexpected_children
  FROM menu child
  JOIN menu parent ON child.parent_id = parent.id
  WHERE parent.catalog_identity IN (
    'admin#dir:examples', '/_auth/admin/countries#page', '/_auth/admin/teams#page',
    '/_auth/admin/countries#action:country-create', '/_auth/admin/teams#action:team-create'
  )
  AND COALESCE(child.catalog_identity, '') NOT IN (
    'admin#dir:examples', '/_auth/admin/countries#page', '/_auth/admin/teams#page',
    '/_auth/admin/countries#action:country-create', '/_auth/admin/teams#action:team-create'
  );
  IF unexpected_children IS NOT NULL THEN
    RAISE EXCEPTION 'retired examples contain non-target child: %', unexpected_children;
  END IF;
END $$;
--> statement-breakpoint
DELETE FROM role_menu WHERE menu_id IN (
  SELECT id FROM menu WHERE catalog_identity IN (
    'admin#dir:examples', '/_auth/admin/countries#page', '/_auth/admin/teams#page',
    '/_auth/admin/countries#action:country-create', '/_auth/admin/teams#action:team-create'
  )
);
--> statement-breakpoint
DELETE FROM menu WHERE catalog_identity IN (
  '/_auth/admin/countries#action:country-create', '/_auth/admin/teams#action:team-create'
);
--> statement-breakpoint
DELETE FROM menu WHERE catalog_identity IN ('/_auth/admin/countries#page', '/_auth/admin/teams#page');
--> statement-breakpoint
DELETE FROM menu WHERE catalog_identity = 'admin#dir:examples';
--> statement-breakpoint
DROP TABLE IF EXISTS "country";
--> statement-breakpoint
DROP TABLE IF EXISTS "team";
