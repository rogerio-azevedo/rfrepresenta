import "server-only";

import { and, asc, count, eq, exists, ilike, isNull, or, sql } from "drizzle-orm";
import { db, type DatabaseExecutor } from "@/server/db";
import {
  catalogCategories,
  productCategories,
  productFacets,
  productImages,
  products,
  r2DeletionQueue,
  type CatalogCategory,
  type Product,
} from "@/server/db/schema";
import { productListQuerySchema, type ProductInput, type ProductListQuery } from "@/schemas/products";
import { requireAdminContext } from "@/server/auth/context";
import { ResourceNotFoundError } from "@/server/auth/errors";
import { buildProductSearchText, extractFacets, slugify } from "@/server/catalog/normalization";

export type ProductWithRelations = Product & {
  categoryPaths: string[];
  facets: Array<{ facetKey: string; valueNormalized: string; valueLabel: string }>;
  images: Array<{
    id: string;
    objectKey: string;
    originalName: string;
    contentType: string;
    sizeBytes: number;
    altText: string;
    position: number;
  }>;
};

function money(value: string | number | null) {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function uniqueSlug(base: string, executor: DatabaseExecutor = db, currentId?: string) {
  const root = slugify(base).slice(0, 180);
  let candidate = root;
  let suffix = 2;

  while (true) {
    const condition = currentId
      ? and(eq(products.slug, candidate), sql`${products.id} <> ${currentId}`)
      : eq(products.slug, candidate);
    const [match] = await executor.select({ id: products.id }).from(products).where(condition).limit(1);
    if (!match) return candidate;
    candidate = `${root}-${suffix++}`;
  }
}

async function ensureCategoryPath(path: string, executor: DatabaseExecutor): Promise<CatalogCategory> {
  const normalizedPath = path.replace(/^\/|\/$/g, "").trim();
  if (!normalizedPath) throw new Error("Categoria invalida.");

  const [existing] = await executor
    .select()
    .from(catalogCategories)
    .where(eq(catalogCategories.path, normalizedPath))
    .limit(1);
  if (existing) return existing;

  const segments = normalizedPath.split("/").filter(Boolean);
  const parentPath = segments.length > 1 ? segments.slice(0, -1).join("/") : null;
  const parent: CatalogCategory | null = parentPath ? await ensureCategoryPath(parentPath, executor) : null;
  const [created] = await executor
    .insert(catalogCategories)
    .values({
      path: normalizedPath,
      slug: slugify(normalizedPath),
      name: segments.at(-1) ?? normalizedPath,
      parentId: parent?.id ?? null,
    })
    .onConflictDoNothing({ target: catalogCategories.path })
    .returning();

  if (created) return created;
  const [retried] = await executor
    .select()
    .from(catalogCategories)
    .where(eq(catalogCategories.path, normalizedPath))
    .limit(1);
  if (!retried) throw new Error("Nao foi possivel criar a categoria.");
  return retried;
}

async function syncProductRelations(
  productId: string,
  categoryPaths: string[],
  specifications: Record<string, unknown>,
  executor: DatabaseExecutor,
) {
  await executor.delete(productCategories).where(eq(productCategories.productId, productId));
  const categories = [];
  for (const path of categoryPaths) categories.push(await ensureCategoryPath(path, executor));
  if (categories.length) {
    await executor.insert(productCategories).values(
      categories.map((category) => ({ productId, categoryId: category.id })),
    );
  }

  await executor.delete(productFacets).where(eq(productFacets.productId, productId));
  const facets = extractFacets(specifications);
  if (facets.length) await executor.insert(productFacets).values(facets.map((facet) => ({ productId, ...facet })));
}

async function getCategoryPaths(productId: string, executor: DatabaseExecutor = db) {
  const rows = await executor
    .select({ path: catalogCategories.path })
    .from(productCategories)
    .innerJoin(catalogCategories, eq(productCategories.categoryId, catalogCategories.id))
    .where(eq(productCategories.productId, productId))
    .orderBy(asc(catalogCategories.path));
  return rows.map((row) => row.path);
}

async function getImages(productId: string, executor: DatabaseExecutor = db) {
  return executor
    .select({
      id: productImages.id,
      objectKey: productImages.objectKey,
      originalName: productImages.originalName,
      contentType: productImages.contentType,
      sizeBytes: productImages.sizeBytes,
      altText: productImages.altText,
      position: productImages.position,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.position));
}

export async function getAdminProduct(productId: string): Promise<ProductWithRelations> {
  await requireAdminContext();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new ResourceNotFoundError();
  const [categoryPaths, facets, images] = await Promise.all([
    getCategoryPaths(productId),
    db.select().from(productFacets).where(eq(productFacets.productId, productId)),
    getImages(productId),
  ]);
  return { ...product, categoryPaths, facets, images };
}

function productWhere(query: ProductListQuery) {
  const filters = [];
  if (query.visibility === "ARCHIVED") filters.push(sql`${products.deletedAt} is not null`);
  else filters.push(isNull(products.deletedAt));
  if (query.visibility === "PUBLIC") filters.push(eq(products.isPublic, true));
  if (query.visibility === "PRIVATE") filters.push(eq(products.isPublic, false));
  if (query.q) {
    const search = `%${query.q}%`;
    filters.push(or(
      ilike(products.name, search),
      ilike(products.reference, search),
      ilike(products.ean, search),
      ilike(products.externalId, search),
    ));
  }
  if (query.brand) filters.push(eq(products.brand, query.brand));
  if (query.categoryPath) {
    filters.push(exists(
      db.select({ id: productCategories.productId })
        .from(productCategories)
        .innerJoin(catalogCategories, eq(productCategories.categoryId, catalogCategories.id))
        .where(and(
          eq(productCategories.productId, products.id),
          eq(catalogCategories.path, query.categoryPath),
        )),
    ));
  }
  return and(...filters);
}

export async function listAdminProducts(rawQuery: Partial<ProductListQuery> = {}) {
  await requireAdminContext();
  const query = productListQuerySchema.parse(rawQuery);
  const where = productWhere(query);
  const offset = (query.page - 1) * query.pageSize;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        reference: products.reference,
        name: products.name,
        brand: products.brand,
        salePrice: products.salePrice,
        cost: products.cost,
        isPublic: products.isPublic,
        deletedAt: products.deletedAt,
        imageKey: productImages.objectKey,
      })
      .from(products)
      .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.position, 0)))
      .where(where)
      .orderBy(asc(products.name))
      .limit(query.pageSize)
      .offset(offset),
    db.select({ total: count() }).from(products).where(where),
  ]);
  return {
    items: rows.map((row) => ({ ...row, salePrice: money(row.salePrice), cost: money(row.cost) })),
    total: Number(total),
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(Number(total) / query.pageSize)),
  };
}

export async function listProductBrands() {
  await requireAdminContext();
  return db.selectDistinct({ brand: products.brand }).from(products).orderBy(asc(products.brand));
}

export async function listCatalogCategories() {
  await requireAdminContext();
  return db
    .select({
      id: catalogCategories.id,
      path: catalogCategories.path,
      slug: catalogCategories.slug,
      name: catalogCategories.name,
      parentId: catalogCategories.parentId,
      sortOrder: catalogCategories.sortOrder,
      isActive: catalogCategories.isActive,
      createdAt: catalogCategories.createdAt,
      updatedAt: catalogCategories.updatedAt,
    })
    .from(catalogCategories)
    .innerJoin(productCategories, eq(productCategories.categoryId, catalogCategories.id))
    .where(eq(catalogCategories.isActive, true))
    .groupBy(catalogCategories.id)
    .orderBy(asc(catalogCategories.path));
}

export async function createProductRecord(input: ProductInput) {
  const context = await requireAdminContext();
  return db.transaction(async (transaction) => {
    const slug = await uniqueSlug(`${input.name}-${input.reference ?? input.externalId ?? crypto.randomUUID().slice(0, 8)}`, transaction);
    const [product] = await transaction
      .insert(products)
      .values({
        source: "MANUAL",
        externalId: input.externalId,
        slug,
        reference: input.reference,
        ean: input.ean,
        name: input.name,
        searchNormalized: buildProductSearchText(input),
        description: input.description,
        brand: input.brand,
        salePrice: input.salePrice?.toFixed(2),
        cost: input.cost?.toFixed(2),
        specifications: input.specifications,
        createdBy: context.userId,
        updatedBy: context.userId,
      })
      .returning();
    if (!product) throw new Error("Product insert did not return a row");
    await syncProductRelations(product.id, input.categories, input.specifications, transaction);
    return product;
  });
}

export async function updateProductRecord(productId: string, input: ProductInput) {
  const context = await requireAdminContext();
  return db.transaction(async (transaction) => {
    const slug = await uniqueSlug(`${input.name}-${input.reference ?? input.externalId ?? productId.slice(0, 8)}`, transaction, productId);
    const [product] = await transaction
      .update(products)
      .set({
        externalId: input.externalId,
        slug,
        reference: input.reference,
        ean: input.ean,
        name: input.name,
        searchNormalized: buildProductSearchText(input),
        description: input.description,
        brand: input.brand,
        salePrice: input.salePrice?.toFixed(2),
        cost: input.cost?.toFixed(2),
        specifications: input.specifications,
        updatedBy: context.userId,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();
    if (!product) throw new ResourceNotFoundError();
    await syncProductRelations(product.id, input.categories, input.specifications, transaction);
    return product;
  });
}

export async function setProductVisibility(productId: string, isPublic: boolean) {
  const context = await requireAdminContext();
  if (isPublic) {
    const [image] = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId)).limit(1);
    if (!image) throw new Error("Adicione ao menos uma imagem antes de publicar.");
  }
  const [product] = await db
    .update(products)
    .set({ isPublic, updatedBy: context.userId, updatedAt: new Date() })
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .returning({ id: products.id });
  if (!product) throw new ResourceNotFoundError();
}

export async function bulkSetProductVisibility(productIds: string[], isPublic: boolean) {
  await requireAdminContext();
  const results: Array<{ id: string; published: boolean; reason?: string }> = [];
  for (const productId of [...new Set(productIds)]) {
    try {
      await setProductVisibility(productId, isPublic);
      results.push({ id: productId, published: isPublic });
    } catch (error) {
      results.push({ id: productId, published: false, reason: error instanceof Error ? error.message : "Falha ao atualizar." });
    }
  }
  return results;
}

export async function bulkSetFilteredProductVisibility(rawQuery: Partial<ProductListQuery>, isPublic: boolean) {
  const context = await requireAdminContext();
  const query = productListQuerySchema.parse({ ...rawQuery, visibility: rawQuery.visibility === "ARCHIVED" ? "ALL" : rawQuery.visibility });
  const filters = [productWhere(query), isNull(products.deletedAt)];
  if (isPublic) {
    filters.push(exists(db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, products.id))));
  }
  const updated = await db
    .update(products)
    .set({ isPublic, updatedBy: context.userId, updatedAt: new Date() })
    .where(and(...filters))
    .returning({ id: products.id });
  return updated.length;
}

export async function archiveProduct(productId: string) {
  const context = await requireAdminContext();
  const [product] = await db
    .update(products)
    .set({ isPublic: false, deletedAt: new Date(), deletedBy: context.userId, updatedBy: context.userId, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning({ id: products.id });
  if (!product) throw new ResourceNotFoundError();
}

export async function restoreProduct(productId: string) {
  const context = await requireAdminContext();
  const [product] = await db
    .update(products)
    .set({ isPublic: false, deletedAt: null, deletedBy: null, updatedBy: context.userId, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning({ id: products.id });
  if (!product) throw new ResourceNotFoundError();
}

export async function confirmProductImage(productId: string, input: { objectKey: string; originalName: string; contentType: string; sizeBytes: number; altText: string }) {
  await requireAdminContext();
  return db.transaction(async (transaction) => {
    const [product] = await transaction.select({ id: products.id }).from(products).where(and(eq(products.id, productId), isNull(products.deletedAt))).limit(1);
    if (!product) throw new ResourceNotFoundError();
    const [{ total }] = await transaction.select({ total: count() }).from(productImages).where(eq(productImages.productId, productId));
    if (Number(total) >= 20) throw new Error("Um produto pode ter no maximo 20 imagens.");
    const [image] = await transaction.insert(productImages).values({ productId, ...input, position: Number(total) }).returning();
    if (!image) throw new Error("Image insert did not return a row");
    return image;
  });
}

export async function removeProductImage(productId: string, imageId: string) {
  await requireAdminContext();
  return db.transaction(async (transaction) => {
    const [image] = await transaction.select().from(productImages).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId))).limit(1);
    if (!image) throw new ResourceNotFoundError();
    await transaction.delete(productImages).where(eq(productImages.id, imageId));
    await transaction.insert(r2DeletionQueue).values({ objectKey: image.objectKey }).onConflictDoNothing({ target: r2DeletionQueue.objectKey });
    const remaining = await transaction.select({ id: productImages.id, position: productImages.position }).from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.position));
    for (const [position, row] of remaining.entries()) {
      if (row.position !== position) await transaction.update(productImages).set({ position }).where(eq(productImages.id, row.id));
    }
    return image;
  });
}

export async function reorderProductImages(productId: string, imageIds: string[]) {
  await requireAdminContext();
  return db.transaction(async (transaction) => {
    const rows = await transaction.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId));
    const actual = new Set(rows.map((row) => row.id));
    if (rows.length !== imageIds.length || imageIds.some((id) => !actual.has(id)) || new Set(imageIds).size !== imageIds.length) {
      throw new Error("A ordem das imagens e invalida.");
    }
    for (const row of rows) await transaction.update(productImages).set({ position: row.id === imageIds[0] ? 1000 : 1000 + rows.indexOf(row) }).where(eq(productImages.id, row.id));
    for (const [position, imageId] of imageIds.entries()) await transaction.update(productImages).set({ position }).where(eq(productImages.id, imageId));
  });
}

export async function removeR2DeletionQueueItem(objectKey: string) {
  await requireAdminContext();
  await db.delete(r2DeletionQueue).where(eq(r2DeletionQueue.objectKey, objectKey));
}

export async function markR2DeletionAttempt(objectKey: string, error: unknown) {
  await requireAdminContext();
  await db
    .update(r2DeletionQueue)
    .set({ attempts: sql`${r2DeletionQueue.attempts} + 1`, lastError: error instanceof Error ? error.message : "Falha ao remover objeto.", updatedAt: new Date() })
    .where(eq(r2DeletionQueue.objectKey, objectKey));
}

export async function listR2DeletionQueue() {
  await requireAdminContext();
  return db.select().from(r2DeletionQueue).orderBy(asc(r2DeletionQueue.createdAt)).limit(100);
}
