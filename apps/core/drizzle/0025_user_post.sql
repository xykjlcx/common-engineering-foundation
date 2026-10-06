ALTER TABLE "app_user" ADD COLUMN "post_id" uuid;
--> statement-breakpoint
DO $$
DECLARE
  position_name text;
  post_identifier uuid;
  generated_code text;
  attempt integer;
BEGIN
  FOR position_name IN SELECT DISTINCT nullif(btrim(position), '') FROM app_user WHERE nullif(btrim(position), '') IS NOT NULL ORDER BY 1
  LOOP
    SELECT id INTO post_identifier FROM post WHERE name = position_name;
    IF post_identifier IS NULL THEN
      IF length(position_name) > 128 THEN
        RAISE EXCEPTION 'legacy position exceeds post name contract: % characters', length(position_name);
      END IF;
      attempt := 0;
      LOOP
        generated_code := 'MIGRATED-' || upper(substr(md5(position_name || ':' || attempt::text), 1, 23));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM post WHERE code = generated_code);
        attempt := attempt + 1;
      END LOOP;
      post_identifier := gen_random_uuid();
      INSERT INTO post (id, code, name, created_at, updated_at) VALUES (post_identifier, generated_code, position_name, now(), now());
    END IF;
    UPDATE app_user SET post_id = post_identifier WHERE nullif(btrim(position), '') = position_name;
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "app_user" DROP COLUMN "position";
