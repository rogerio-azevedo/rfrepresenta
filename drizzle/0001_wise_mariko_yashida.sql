CREATE TYPE "public"."product_source" AS ENUM('MANUAL', 'ALTENBURG');--> statement-breakpoint
CREATE TABLE "catalog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_facets" (
	"product_id" uuid NOT NULL,
	"facet_key" text NOT NULL,
	"value_normalized" text NOT NULL,
	"value_label" text NOT NULL,
	CONSTRAINT "product_facets_product_id_facet_key_value_normalized_pk" PRIMARY KEY("product_id","facet_key","value_normalized")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_size_positive" CHECK ("product_images"."size_bytes" > 0),
	CONSTRAINT "product_images_position_non_negative" CHECK ("product_images"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "product_source" DEFAULT 'MANUAL' NOT NULL,
	"external_id" text,
	"slug" text NOT NULL,
	"reference" text,
	"ean" text,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"brand" text NOT NULL,
	"sale_price" numeric(12, 2),
	"cost" numeric(12, 2),
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sale_price_non_negative" CHECK ("products"."sale_price" is null or "products"."sale_price" >= 0),
	CONSTRAINT "products_cost_non_negative" CHECK ("products"."cost" is null or "products"."cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "r2_deletion_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_facets" ADD CONSTRAINT "product_facets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_categories_path_unique" ON "catalog_categories" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_categories_slug_unique" ON "catalog_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_categories_parent_idx" ON "catalog_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "catalog_categories_active_order_idx" ON "catalog_categories" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "product_categories_category_idx" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_facets_lookup_idx" ON "product_facets" USING btree ("facet_key","value_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_object_key_unique" ON "product_images" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_product_position_unique" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "products_source_external_id_unique" ON "products" USING btree ("source","external_id") WHERE "products"."external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "products_reference_unique" ON "products" USING btree ("reference") WHERE "products"."reference" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "products_ean_unique" ON "products" USING btree ("ean") WHERE "products"."ean" is not null;--> statement-breakpoint
CREATE INDEX "products_public_deleted_idx" ON "products" USING btree ("is_public","deleted_at");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "r2_deletion_queue_object_key_unique" ON "r2_deletion_queue" USING btree ("object_key");