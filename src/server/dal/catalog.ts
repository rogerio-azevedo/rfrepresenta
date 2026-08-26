import "server-only";

import { cache } from "react";
import { and, asc, countDistinct, desc, eq, exists, ilike, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  catalogCategories,
  catalogCollectionCategories,
  catalogCollections,
  productCategories,
  productFacets,
  productFamilies,
  productFamilyMembers,
  productImages,
  products,
} from "@/server/db/schema";
import { getCurrentContext } from "@/server/auth/context";
import { normalizeKey, valuesFromSpec } from "@/server/catalog/normalization";
import { catalogQuerySchema, type CatalogQuery } from "@/schemas/products";
import { ResourceNotFoundError } from "@/server/auth/errors";

const FACET_PARAMS = {
  color: "color",
  size: "size",
  fabric: "fabric",
  composition: "composition",
  filling: "filling",
  sleepPosition: "sleep_position",
  support: "support",
  pieceCount: "piece_count",
} as const;

export type CatalogViewer =
  | { kind: "visitor" }
  | { kind: "client"; clientId: string; clientName: string };

export type CatalogFamilyCard = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageKey: string | null;
  imageAlt: string;
  variantCount: number;
  colors: string[];
  sizes: string[];
  priceFrom?: number | null;
};

export type CatalogVariant = {
  id: string;
  name: string;
  reference: string | null;
  ean: string | null;
  specifications: Record<string, unknown>;
  imageKey: string | null;
  imageAlt: string;
  commercialPrice?: number | null;
};

export type CatalogFamilyDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: string;
  variants: CatalogVariant[];
  images: Array<{ objectKey: string; altText: string; position: number; productId: string }>;
};

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function specLabels(specifications: Record<string, unknown>, keys: string[]) {
  const normalizedKeys = new Set(keys.map(normalizeKey));
  return Object.entries(specifications)
    .filter(([key]) => normalizedKeys.has(normalizeKey(key)))
    .flatMap(([, value]) => valuesFromSpec(value));
}

export const getCatalogViewer = cache(async (): Promise<CatalogViewer> => {
  const context = await getCurrentContext();
  if (context?.kind === "client" && !context.mustChangePassword) {
    return { kind: "client", clientId: context.clientId, clientName: context.clientName };
  }
  return { kind: "visitor" };
});

function productConditions(query: CatalogQuery) {
  const conditions = [eq(products.isPublic, true), isNull(products.deletedAt)];
  if (query.q) conditions.push(ilike(products.searchNormalized, `%${normalizeKey(query.q)}%`));
  if (query.collection) {
    conditions.push(exists(
      db.select({ id: productCategories.productId })
        .from(productCategories)
        .innerJoin(catalogCollectionCategories, eq(catalogCollectionCategories.categoryId, productCategories.categoryId))
        .innerJoin(catalogCollections, eq(catalogCollections.id, catalogCollectionCategories.collectionId))
        .where(and(
          eq(productCategories.productId, products.id),
          eq(catalogCollections.slug, query.collection),
          eq(catalogCollections.isActive, true),
        )),
    ));
  }
  if (query.category) {
    conditions.push(exists(
      db.select({ id: productCategories.productId })
        .from(productCategories)
        .innerJoin(catalogCategories, eq(catalogCategories.id, productCategories.categoryId))
        .where(and(eq(productCategories.productId, products.id), eq(catalogCategories.slug, query.category))),
    ));
  }
  for (const [param, facetKey] of Object.entries(FACET_PARAMS) as Array<[keyof typeof FACET_PARAMS, string]>) {
    const values = query[param];
    if (!values.length) continue;
    conditions.push(exists(
      db.select({ id: productFacets.productId })
        .from(productFacets)
        .where(and(
          eq(productFacets.productId, products.id),
          eq(productFacets.facetKey, facetKey),
          inArray(productFacets.valueNormalized, values),
        )),
    ));
  }
  return and(...conditions);
}

async function loadFamilyMembers(familyIds: string[], includePrice: boolean) {
  if (!familyIds.length) return [];
  const publicFields = {
    familyId: productFamilyMembers.familyId,
    sortOrder: productFamilyMembers.sortOrder,
    id: products.id,
    name: products.name,
    reference: products.reference,
    ean: products.ean,
    specifications: products.specifications,
    imageKey: productImages.objectKey,
    imageAlt: productImages.altText,
  };
  const selection = includePrice ? { ...publicFields, salePrice: products.salePrice } : publicFields;
  return db
    .select(selection)
    .from(productFamilyMembers)
    .innerJoin(products, eq(products.id, productFamilyMembers.productId))
    .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.position, 0)))
    .where(and(
      inArray(productFamilyMembers.familyId, familyIds),
      eq(products.isPublic, true),
      isNull(products.deletedAt),
    ))
    .orderBy(asc(productFamilyMembers.sortOrder), asc(products.name));
}

export async function listCatalogFamilies(rawQuery: Partial<CatalogQuery> = {}) {
  const viewer = await getCatalogViewer();
  const parsed = catalogQuerySchema.parse(rawQuery);
  const query = viewer.kind === "visitor" && (parsed.sort === "PRICE_ASC" || parsed.sort === "PRICE_DESC")
    ? { ...parsed, sort: "RELEVANCE" as const }
    : parsed;
  const where = productConditions(query);
  const offset = (query.page - 1) * query.pageSize;
  const minPrice = sql<string | null>`min(${products.salePrice})`;
  const publicFamilyFields = {
    id: productFamilies.id,
    slug: productFamilies.slug,
    name: productFamilies.name,
    brand: productFamilies.brand,
    defaultProductId: productFamilies.defaultProductId,
  };
  const familySelection = viewer.kind === "client" ? { ...publicFamilyFields, minPrice } : publicFamilyFields;
  const orderBy = query.sort === "NAME_DESC"
    ? desc(productFamilies.name)
    : query.sort === "PRICE_ASC"
      ? sql`${minPrice} asc nulls last`
      : query.sort === "PRICE_DESC"
        ? sql`${minPrice} desc nulls last`
        : asc(productFamilies.name);

  const [familyRows, [totalRow]] = await Promise.all([
    db.select(familySelection)
      .from(productFamilies)
      .innerJoin(productFamilyMembers, eq(productFamilyMembers.familyId, productFamilies.id))
      .innerJoin(products, eq(products.id, productFamilyMembers.productId))
      .where(where)
      .groupBy(productFamilies.id)
      .orderBy(orderBy)
      .limit(query.pageSize)
      .offset(offset),
    db.select({ total: countDistinct(productFamilies.id) })
      .from(productFamilies)
      .innerJoin(productFamilyMembers, eq(productFamilyMembers.familyId, productFamilies.id))
      .innerJoin(products, eq(products.id, productFamilyMembers.productId))
      .where(where),
  ]);

  const members = await loadFamilyMembers(familyRows.map((family) => family.id), viewer.kind === "client");
  const items: CatalogFamilyCard[] = familyRows.map((family) => {
    const familyMembers = members.filter((member) => member.familyId === family.id);
    const preferred = familyMembers.find((member) => member.id === family.defaultProductId) ?? familyMembers[0];
    const colors = [...new Set(familyMembers.flatMap((member) => specLabels(member.specifications, ["Cor", "Cor principal"])))];
    const sizes = [...new Set(familyMembers.flatMap((member) => specLabels(member.specifications, ["Tamanho", "Tamanho - Travesseiro"])))];
    const card: CatalogFamilyCard = {
      id: family.id,
      slug: family.slug,
      name: family.name,
      brand: family.brand,
      imageKey: preferred?.imageKey ?? null,
      imageAlt: preferred?.imageAlt ?? family.name,
      variantCount: familyMembers.length,
      colors,
      sizes,
    };
    if (viewer.kind === "client" && "minPrice" in family) card.priceFrom = money(family.minPrice);
    return card;
  });

  const total = Number(totalRow?.total ?? 0);
  return { viewer, query, items, total, pageCount: Math.max(1, Math.ceil(total / query.pageSize)) };
}

export async function listCatalogFacets(rawQuery: Partial<CatalogQuery> = {}) {
  const query = catalogQuerySchema.parse(rawQuery);
  const rows = await db
    .select({
      key: productFacets.facetKey,
      value: productFacets.valueNormalized,
      label: sql<string>`min(${productFacets.valueLabel})`,
      count: countDistinct(productFamilies.id),
    })
    .from(productFacets)
    .innerJoin(products, eq(products.id, productFacets.productId))
    .innerJoin(productFamilyMembers, eq(productFamilyMembers.productId, products.id))
    .innerJoin(productFamilies, eq(productFamilies.id, productFamilyMembers.familyId))
    .where(and(productConditions(query), inArray(productFacets.facetKey, Object.values(FACET_PARAMS))))
    .groupBy(productFacets.facetKey, productFacets.valueNormalized)
    .orderBy(asc(productFacets.facetKey), desc(countDistinct(productFamilies.id)), asc(productFacets.valueNormalized));
  return rows.map((row) => ({ ...row, count: Number(row.count) }));
}

export async function listActiveCatalogCollections() {
  const rows = await db
    .select({
      id: catalogCollections.id,
      slug: catalogCollections.slug,
      name: catalogCollections.name,
      description: catalogCollections.description,
      imageKey: catalogCollections.imageKey,
      sortOrder: catalogCollections.sortOrder,
      familyCount: countDistinct(productFamilies.id),
    })
    .from(catalogCollections)
    .leftJoin(catalogCollectionCategories, eq(catalogCollectionCategories.collectionId, catalogCollections.id))
    .leftJoin(productCategories, eq(productCategories.categoryId, catalogCollectionCategories.categoryId))
    .leftJoin(products, and(eq(products.id, productCategories.productId), eq(products.isPublic, true), isNull(products.deletedAt)))
    .leftJoin(productFamilyMembers, eq(productFamilyMembers.productId, products.id))
    .leftJoin(productFamilies, eq(productFamilies.id, productFamilyMembers.familyId))
    .where(eq(catalogCollections.isActive, true))
    .groupBy(catalogCollections.id)
    .orderBy(asc(catalogCollections.sortOrder), asc(catalogCollections.name));
  return rows.map((row) => ({ ...row, familyCount: Number(row.familyCount) }));
}

export async function listFeaturedCatalogCollections() {
  const collections = await listActiveCatalogCollections();
  const featuredIds = await db.select({ id: catalogCollections.id }).from(catalogCollections).where(eq(catalogCollections.isFeatured, true));
  const ids = new Set(featuredIds.map((item) => item.id));
  return collections.filter((collection) => ids.has(collection.id)).slice(0, 4);
}

export async function listCatalogCategoriesForCollection(collectionSlug = "") {
  const conditions = [eq(catalogCategories.isActive, true)];
  if (collectionSlug) conditions.push(eq(catalogCollections.slug, collectionSlug));
  const rows = await db
    .select({ slug: catalogCategories.slug, name: catalogCategories.name, path: catalogCategories.path, count: countDistinct(productFamilies.id) })
    .from(catalogCategories)
    .innerJoin(productCategories, eq(productCategories.categoryId, catalogCategories.id))
    .innerJoin(products, and(eq(products.id, productCategories.productId), eq(products.isPublic, true), isNull(products.deletedAt)))
    .innerJoin(productFamilyMembers, eq(productFamilyMembers.productId, products.id))
    .innerJoin(productFamilies, eq(productFamilies.id, productFamilyMembers.familyId))
    .leftJoin(catalogCollectionCategories, eq(catalogCollectionCategories.categoryId, catalogCategories.id))
    .leftJoin(catalogCollections, eq(catalogCollections.id, catalogCollectionCategories.collectionId))
    .where(and(...conditions))
    .groupBy(catalogCategories.id)
    .orderBy(desc(countDistinct(productFamilies.id)), asc(catalogCategories.path));
  return rows.map((row) => ({ ...row, count: Number(row.count) }));
}

export async function listPublishedCatalogFamilySlugs() {
  return db
    .selectDistinct({ slug: productFamilies.slug, updatedAt: productFamilies.updatedAt })
    .from(productFamilies)
    .innerJoin(productFamilyMembers, eq(productFamilyMembers.familyId, productFamilies.id))
    .innerJoin(products, eq(products.id, productFamilyMembers.productId))
    .where(and(eq(products.isPublic, true), isNull(products.deletedAt)))
    .orderBy(asc(productFamilies.slug));
}

export const getPublishedCatalogFamily = cache(async (slug: string): Promise<{ viewer: CatalogViewer; family: CatalogFamilyDetail }> => {
  const viewer = await getCatalogViewer();
  const [family] = await db.select().from(productFamilies).where(eq(productFamilies.slug, slug)).limit(1);
  if (!family) throw new ResourceNotFoundError();
  const members = await loadFamilyMembers([family.id], viewer.kind === "client");
  if (!members.length) throw new ResourceNotFoundError();
  const images = await db
    .select({ productId: productImages.productId, objectKey: productImages.objectKey, altText: productImages.altText, position: productImages.position })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .innerJoin(productFamilyMembers, eq(productFamilyMembers.productId, products.id))
    .where(and(eq(productFamilyMembers.familyId, family.id), eq(products.isPublic, true), isNull(products.deletedAt)))
    .orderBy(asc(productFamilyMembers.sortOrder), asc(productImages.position));
  const variants: CatalogVariant[] = members.map((member) => {
    const variant: CatalogVariant = {
      id: member.id,
      name: member.name,
      reference: member.reference,
      ean: member.ean,
      specifications: member.specifications,
      imageKey: member.imageKey ?? null,
      imageAlt: member.imageAlt ?? member.name,
    };
    if (viewer.kind === "client" && "salePrice" in member) variant.commercialPrice = money(member.salePrice as string | null);
    return variant;
  });
  return {
    viewer,
    family: { id: family.id, slug: family.slug, name: family.name, description: family.description, brand: family.brand, variants, images },
  };
});
