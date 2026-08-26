import "server-only";

import { and, asc, count, countDistinct, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  catalogCategories,
  catalogCollectionCategories,
  catalogCollections,
  productFamilies,
  productFamilyMembers,
  productImages,
  products,
} from "@/server/db/schema";
import { requireAdminContext } from "@/server/auth/context";
import { ResourceNotFoundError } from "@/server/auth/errors";
import { familySlug } from "@/server/catalog/families";
import { slugify } from "@/server/catalog/normalization";
import type { z } from "zod";
import { collectionInputSchema, familyInputSchema } from "@/schemas/products";

type FamilyInput = z.infer<typeof familyInputSchema>;
type CollectionInput = z.infer<typeof collectionInputSchema>;

export async function listAdminFamilies(input: { q?: string; status?: "ALL" | "AUTO_APPROVED" | "NEEDS_REVIEW" | "REVIEWED"; page?: number } = {}) {
  await requireAdminContext();
  const page = Math.max(1, input.page ?? 1);
  const conditions = [];
  if (input.q) conditions.push(ilike(productFamilies.name, `%${input.q}%`));
  if (input.status && input.status !== "ALL") conditions.push(eq(productFamilies.reviewStatus, input.status));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [total]] = await Promise.all([
    db.select({
      id: productFamilies.id,
      slug: productFamilies.slug,
      name: productFamilies.name,
      brand: productFamilies.brand,
      reviewStatus: productFamilies.reviewStatus,
      memberCount: count(productFamilyMembers.productId),
      publicCount: sql<number>`count(${productFamilyMembers.productId}) filter (where ${products.isPublic} = true and ${products.deletedAt} is null)`,
    })
      .from(productFamilies)
      .leftJoin(productFamilyMembers, eq(productFamilyMembers.familyId, productFamilies.id))
      .leftJoin(products, eq(products.id, productFamilyMembers.productId))
      .where(where)
      .groupBy(productFamilies.id)
      .orderBy(asc(productFamilies.name))
      .limit(50)
      .offset((page - 1) * 50),
    db.select({ total: count() }).from(productFamilies).where(where),
  ]);
  return { items: rows.map((row) => ({ ...row, memberCount: Number(row.memberCount), publicCount: Number(row.publicCount) })), total: Number(total?.total ?? 0), page };
}

export async function getAdminFamily(familyId: string) {
  await requireAdminContext();
  const [family] = await db.select().from(productFamilies).where(eq(productFamilies.id, familyId)).limit(1);
  if (!family) throw new ResourceNotFoundError();
  const members = await db
    .select({
      id: products.id,
      name: products.name,
      reference: products.reference,
      ean: products.ean,
      isPublic: products.isPublic,
      salePrice: products.salePrice,
      sortOrder: productFamilyMembers.sortOrder,
      imageKey: productImages.objectKey,
    })
    .from(productFamilyMembers)
    .innerJoin(products, eq(products.id, productFamilyMembers.productId))
    .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.position, 0)))
    .where(eq(productFamilyMembers.familyId, familyId))
    .orderBy(asc(productFamilyMembers.sortOrder), asc(products.name));
  return { ...family, members };
}

export async function updateFamilyRecord(familyId: string, input: FamilyInput) {
  await requireAdminContext();
  const [member] = input.defaultProductId
    ? await db.select({ id: productFamilyMembers.productId }).from(productFamilyMembers).where(and(eq(productFamilyMembers.familyId, familyId), eq(productFamilyMembers.productId, input.defaultProductId))).limit(1)
    : [null];
  if (input.defaultProductId && !member) throw new Error("O SKU principal deve pertencer a familia.");
  const [updated] = await db.update(productFamilies).set({ ...input, updatedAt: new Date() }).where(eq(productFamilies.id, familyId)).returning();
  if (!updated) throw new ResourceNotFoundError();
  return updated;
}

export async function mergeFamilyRecords(sourceFamilyId: string, targetFamilyId: string) {
  await requireAdminContext();
  if (sourceFamilyId === targetFamilyId) throw new Error("Escolha outra familia para unir.");
  return db.transaction(async (transaction) => {
    const [target] = await transaction.select().from(productFamilies).where(eq(productFamilies.id, targetFamilyId)).limit(1);
    const sourceMembers = await transaction.select().from(productFamilyMembers).where(eq(productFamilyMembers.familyId, sourceFamilyId));
    if (!target || !sourceMembers.length) throw new ResourceNotFoundError();
    const [{ total }] = await transaction.select({ total: count() }).from(productFamilyMembers).where(eq(productFamilyMembers.familyId, targetFamilyId));
    for (const [offset, member] of sourceMembers.entries()) {
      await transaction.update(productFamilyMembers).set({ familyId: targetFamilyId, sortOrder: Number(total) + offset }).where(and(eq(productFamilyMembers.familyId, sourceFamilyId), eq(productFamilyMembers.productId, member.productId)));
    }
    if (!target.defaultProductId) await transaction.update(productFamilies).set({ defaultProductId: sourceMembers[0].productId, updatedAt: new Date() }).where(eq(productFamilies.id, targetFamilyId));
    await transaction.delete(productFamilies).where(eq(productFamilies.id, sourceFamilyId));
  });
}

export async function splitFamilyRecord(sourceFamilyId: string, productIds: string[], name: string) {
  await requireAdminContext();
  return db.transaction(async (transaction) => {
    const [source] = await transaction.select({ defaultProductId: productFamilies.defaultProductId }).from(productFamilies).where(eq(productFamilies.id, sourceFamilyId)).limit(1);
    if (!source) throw new ResourceNotFoundError();
    const members = await transaction
      .select({ id: products.id, brand: products.brand, description: products.description })
      .from(productFamilyMembers)
      .innerJoin(products, eq(products.id, productFamilyMembers.productId))
      .where(and(eq(productFamilyMembers.familyId, sourceFamilyId), inArray(productFamilyMembers.productId, productIds)));
    if (!members.length || members.length !== new Set(productIds).size) throw new Error("Selecao de SKUs invalida.");
    const [created] = await transaction.insert(productFamilies).values({
      name,
      slug: familySlug(name, `manual:${crypto.randomUUID()}`),
      description: members[0].description,
      brand: members[0].brand,
      reviewStatus: "REVIEWED",
      defaultProductId: members[0].id,
    }).returning();
    if (!created) throw new Error("Familia nao criada.");
    for (const [sortOrder, member] of members.entries()) {
      await transaction.update(productFamilyMembers).set({ familyId: created.id, sortOrder }).where(and(eq(productFamilyMembers.familyId, sourceFamilyId), eq(productFamilyMembers.productId, member.id)));
    }
    const [remaining] = await transaction.select({ id: productFamilyMembers.productId }).from(productFamilyMembers).where(eq(productFamilyMembers.familyId, sourceFamilyId)).limit(1);
    if (!remaining) {
      await transaction.delete(productFamilies).where(eq(productFamilies.id, sourceFamilyId));
    } else if (source.defaultProductId && productIds.includes(source.defaultProductId)) {
      await transaction.update(productFamilies).set({ defaultProductId: remaining.id, updatedAt: new Date() }).where(eq(productFamilies.id, sourceFamilyId));
    }
    return created;
  });
}

export async function listAdminCollections() {
  await requireAdminContext();
  return db.select({
    id: catalogCollections.id,
    slug: catalogCollections.slug,
    name: catalogCollections.name,
    description: catalogCollections.description,
    imageKey: catalogCollections.imageKey,
    sortOrder: catalogCollections.sortOrder,
    isFeatured: catalogCollections.isFeatured,
    isActive: catalogCollections.isActive,
    categoryCount: countDistinct(catalogCollectionCategories.categoryId),
  }).from(catalogCollections)
    .leftJoin(catalogCollectionCategories, eq(catalogCollectionCategories.collectionId, catalogCollections.id))
    .groupBy(catalogCollections.id)
    .orderBy(asc(catalogCollections.sortOrder), asc(catalogCollections.name));
}

export async function getAdminCollection(collectionId: string) {
  await requireAdminContext();
  const [collection] = await db.select().from(catalogCollections).where(eq(catalogCollections.id, collectionId)).limit(1);
  if (!collection) throw new ResourceNotFoundError();
  const categoryRows = await db.select({ id: catalogCollectionCategories.categoryId }).from(catalogCollectionCategories).where(eq(catalogCollectionCategories.collectionId, collectionId));
  return { ...collection, categoryIds: categoryRows.map((row) => row.id) };
}

export async function saveCollectionRecord(collectionId: string | null, input: CollectionInput) {
  await requireAdminContext();
  return db.transaction(async (transaction) => {
    if (input.isFeatured) {
      const [{ total }] = await transaction.select({ total: count() }).from(catalogCollections).where(and(eq(catalogCollections.isFeatured, true), collectionId ? sql`${catalogCollections.id} <> ${collectionId}` : undefined));
      if (Number(total) >= 4) throw new Error("A vitrine da landing aceita no maximo quatro colecoes.");
    }
    const normalizedSlug = slugify(input.slug);
    const values = { ...input, slug: normalizedSlug, updatedAt: new Date() };
    const [collection] = collectionId
      ? await transaction.update(catalogCollections).set(values).where(eq(catalogCollections.id, collectionId)).returning()
      : await transaction.insert(catalogCollections).values(values).returning();
    if (!collection) throw new ResourceNotFoundError();
    await transaction.delete(catalogCollectionCategories).where(eq(catalogCollectionCategories.collectionId, collection.id));
    if (input.categoryIds.length) await transaction.insert(catalogCollectionCategories).values(input.categoryIds.map((categoryId) => ({ collectionId: collection.id, categoryId })));
    return collection;
  });
}

export async function listAllCategoriesForAdmin() {
  await requireAdminContext();
  return db.select().from(catalogCategories).orderBy(asc(catalogCategories.path));
}

export type CommercialPriceRow = { reference?: string; ean?: string; salePrice: number | null; cost?: number | null };

export async function applyCommercialPriceRows(rows: CommercialPriceRow[]) {
  const context = await requireAdminContext();
  return db.transaction(async (transaction) => {
    let updated = 0;
    for (const row of rows) {
      const condition = row.reference ? eq(products.reference, row.reference) : row.ean ? eq(products.ean, row.ean) : undefined;
      if (!condition) throw new Error("Linha sem referencia ou EAN.");
      const [product] = await transaction.update(products).set({
        salePrice: row.salePrice === null ? null : row.salePrice.toFixed(2),
        cost: row.cost === undefined || row.cost === null ? row.cost === null ? null : undefined : row.cost.toFixed(2),
        updatedBy: context.userId,
        updatedAt: new Date(),
      }).where(condition).returning({ id: products.id });
      if (!product) throw new Error(`Produto nao encontrado: ${row.reference ?? row.ean}`);
      updated++;
    }
    return updated;
  });
}
