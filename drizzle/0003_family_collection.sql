ALTER TABLE "product_families" ADD COLUMN "collection_id" uuid;--> statement-breakpoint
ALTER TABLE "product_families" ADD CONSTRAINT "product_families_collection_id_catalog_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."catalog_collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_families_collection_idx" ON "product_families" USING btree ("collection_id");
