import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const productSourceEnum = pgEnum("product_source", [
  "MANUAL",
  "ALTENBURG",
  "CSV",
  "ERP",
]);

export const familyReviewStatusEnum = pgEnum("family_review_status", [
  "AUTO_APPROVED",
  "NEEDS_REVIEW",
  "REVIEWED",
]);

export const productFamilies = pgTable(
  "product_families",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    brand: text("brand").notNull().default("Altenburg"),
    reviewStatus: familyReviewStatusEnum("review_status")
      .notNull()
      .default("AUTO_APPROVED"),
    defaultProductId: uuid("default_product_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("product_families_slug_unique").on(table.slug),
    index("product_families_name_idx").on(table.name),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    reference: text("reference"),
    ean: text("ean"),
    brand: text("brand").notNull().default("Altenburg"),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    sourcePrice: numeric("source_price", { precision: 12, scale: 2 }),
    salePrice: numeric("sale_price", { precision: 12, scale: 2 }),
    source: productSourceEnum("source").notNull().default("MANUAL"),
    externalId: text("external_id"),
    rawPayload: text("raw_payload"),
    isPublic: boolean("is_public").notNull().default(true),
    specs: text("specs").notNull().default("{}"),
    specifications: jsonb("specifications")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    searchNormalized: text("search_normalized").notNull().default(""),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    uniqueIndex("products_source_external_id_unique")
      .on(table.source, table.externalId)
      .where(sql`${table.externalId} is not null`),
    index("products_reference_idx").on(table.reference),
    index("products_ean_idx").on(table.ean),
    index("products_public_deleted_idx").on(table.isPublic, table.deletedAt),
    index("products_brand_idx").on(table.brand),
    index("products_name_idx").on(table.name),
    index("products_search_normalized_idx").on(table.searchNormalized),
    check(
      "products_source_price_non_negative",
      sql`${table.sourcePrice} is null or ${table.sourcePrice} >= 0`,
    ),
    check(
      "products_sale_price_non_negative",
      sql`${table.salePrice} is null or ${table.salePrice} >= 0`,
    ),
    check(
      "products_cost_non_negative",
      sql`${table.cost} is null or ${table.cost} >= 0`,
    ),
  ],
);

export const productFamilyMembers = pgTable(
  "product_family_members",
  {
    familyId: uuid("family_id")
      .notNull()
      .references(() => productFamilies.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.familyId, table.productId] }),
    uniqueIndex("product_family_members_product_unique").on(table.productId),
    index("product_family_members_family_order_idx").on(
      table.familyId,
      table.sortOrder,
    ),
  ],
);

export const catalogCategories = pgTable(
  "catalog_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    path: text("path").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("catalog_categories_path_unique").on(table.path),
    uniqueIndex("catalog_categories_slug_unique").on(table.slug),
    index("catalog_categories_parent_idx").on(table.parentId),
    index("catalog_categories_active_order_idx").on(
      table.isActive,
      table.sortOrder,
    ),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogCategories.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    index("product_categories_category_idx").on(table.categoryId),
  ],
);

export const catalogCollections = pgTable(
  "catalog_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    imageKey: text("image_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("catalog_collections_slug_unique").on(table.slug),
    index("catalog_collections_featured_order_idx").on(
      table.isFeatured,
      table.isActive,
      table.sortOrder,
    ),
  ],
);

export const catalogCollectionCategories = pgTable(
  "catalog_collection_categories",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => catalogCollections.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogCategories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.categoryId] }),
    index("catalog_collection_categories_category_idx").on(table.categoryId),
  ],
);

export const productFacets = pgTable(
  "product_facets",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    facetKey: text("facet_key").notNull(),
    valueNormalized: text("value_normalized").notNull(),
    valueLabel: text("value_label").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.productId, table.facetKey, table.valueNormalized],
    }),
    index("product_facets_lookup_idx").on(
      table.facetKey,
      table.valueNormalized,
    ),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    altText: text("alt_text").notNull().default(""),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("product_images_object_key_idx").on(table.objectKey),
    uniqueIndex("product_images_product_object_key_unique").on(
      table.productId,
      table.objectKey,
    ),
    uniqueIndex("product_images_product_position_unique").on(
      table.productId,
      table.position,
    ),
    index("product_images_product_idx").on(table.productId, table.position),
    check("product_images_size_positive", sql`${table.sizeBytes} > 0`),
    check("product_images_position_non_negative", sql`${table.position} >= 0`),
  ],
);

export const r2DeletionQueue = pgTable(
  "r2_deletion_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    objectKey: text("object_key").notNull(),
    status: text("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("r2_deletion_queue_status_idx").on(table.status, table.attempts),
  ],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type CatalogCategory = typeof catalogCategories.$inferSelect;
export type CatalogCollection = typeof catalogCollections.$inferSelect;
export type ProductFamily = typeof productFamilies.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
