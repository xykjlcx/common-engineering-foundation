ALTER TABLE "menu" ADD COLUMN "catalog_identity" text;--> statement-breakpoint
ALTER TABLE "menu" ADD CONSTRAINT "menu_catalog_identity_unique" UNIQUE("catalog_identity");