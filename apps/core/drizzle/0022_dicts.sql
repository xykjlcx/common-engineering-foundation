CREATE TABLE "dict_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type_id" uuid NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"tone" text DEFAULT 'neutral' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"remark" text DEFAULT '' NOT NULL,
	"builtin" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "dict_item_tone_check" CHECK ("dict_item"."tone" in ('neutral', 'info', 'success', 'warning', 'danger'))
);
--> statement-breakpoint
CREATE TABLE "dict_type" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"remark" text DEFAULT '' NOT NULL,
	"builtin" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "dict_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "dict_item" ADD CONSTRAINT "dict_item_type_id_dict_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."dict_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dict_item_type_value_idx" ON "dict_item" USING btree ("type_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "dict_item_default_idx" ON "dict_item" USING btree ("type_id") WHERE "dict_item"."is_default" = true;