CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "unaccent";--> statement-breakpoint
CREATE TYPE "public"."catalog_family_review" AS ENUM('AUTO_APPROVED', 'NEEDS_REVIEW', 'REVIEWED');--> statement-breakpoint
CREATE TABLE "catalog_collection_categories" (
	"collection_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "catalog_collection_categories_collection_id_category_id_pk" PRIMARY KEY("collection_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"brand" text NOT NULL,
	"review_status" "catalog_family_review" DEFAULT 'NEEDS_REVIEW' NOT NULL,
	"default_product_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_family_members" (
	"family_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_family_members_family_id_product_id_pk" PRIMARY KEY("family_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "search_normalized" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "source_price" numeric(12, 2);--> statement-breakpoint
UPDATE "products"
SET
	"source_price" = "sale_price",
	"sale_price" = NULL,
	"search_normalized" = trim(regexp_replace(lower(unaccent(concat_ws(' ', "name", "reference", "ean", "brand"))), '[^a-z0-9]+', ' ', 'g'));--> statement-breakpoint
ALTER TABLE "catalog_collection_categories" ADD CONSTRAINT "catalog_collection_categories_collection_id_catalog_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."catalog_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_collection_categories" ADD CONSTRAINT "catalog_collection_categories_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_family_members" ADD CONSTRAINT "product_family_members_family_id_product_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."product_families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_family_members" ADD CONSTRAINT "product_family_members_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_collection_categories_category_idx" ON "catalog_collection_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_collections_slug_unique" ON "catalog_collections" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_collections_featured_order_idx" ON "catalog_collections" USING btree ("is_featured","is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_families_slug_unique" ON "product_families" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_families_review_idx" ON "product_families" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "product_families_brand_name_idx" ON "product_families" USING btree ("brand","name");--> statement-breakpoint
CREATE UNIQUE INDEX "product_family_members_product_unique" ON "product_family_members" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_family_members_family_order_idx" ON "product_family_members" USING btree ("family_id","sort_order");--> statement-breakpoint
CREATE INDEX "products_search_normalized_idx" ON "products" USING btree ("search_normalized");--> statement-breakpoint
CREATE INDEX "products_search_normalized_trgm_idx" ON "products" USING gin ("search_normalized" gin_trgm_ops);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_source_price_non_negative" CHECK ("products"."source_price" is null or "products"."source_price" >= 0);
