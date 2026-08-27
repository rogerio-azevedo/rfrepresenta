import { and, eq, exists, inArray, isNull, like, notExists, notInArray, or } from "drizzle-orm";
import {
  EDITORIAL_COLLECTION_SLUGS,
  EDITORIAL_DEPARTMENTS,
  isEditorialCollectionSlug,
  toJsonLineSlug,
} from "./b2b-categories";
import {
  catalogCategories,
  catalogCollectionCategories,
  catalogCollections,
  productCategories,
  productFamilies,
} from "@/server/db/schema";
import type { db as appDb } from "@/server/db";

export type EditorialSyncDb = Pick<typeof appDb, "select" | "insert" | "update" | "delete">;

export async function ensureLineSlugSeparation(db: EditorialSyncDb) {
  for (const jsonSlug of ["banho", "travesseiros"]) {
    const lineSlug = `linha-${jsonSlug}`;
    const [line] = await db
      .select({ id: catalogCollections.id })
      .from(catalogCollections)
      .where(eq(catalogCollections.slug, lineSlug))
      .limit(1);
    if (line) continue;
    const [colliding] = await db
      .select({ id: catalogCollections.id })
      .from(catalogCollections)
      .where(eq(catalogCollections.slug, jsonSlug))
      .limit(1);
    if (!colliding) continue;
    await db
      .update(catalogCollections)
      .set({ slug: lineSlug, isFeatured: false, updatedAt: new Date() })
      .where(eq(catalogCollections.id, colliding.id));
  }
}

export async function upsertEditorialDepartments(db: EditorialSyncDb) {
  for (const department of EDITORIAL_DEPARTMENTS) {
    const [existing] = await db
      .select({
        id: catalogCollections.id,
        name: catalogCollections.name,
        description: catalogCollections.description,
      })
      .from(catalogCollections)
      .where(eq(catalogCollections.slug, department.slug))
      .limit(1);
    if (existing) {
      await db
        .update(catalogCollections)
        .set({
          sortOrder: department.sortOrder,
          isFeatured: true,
          isActive: true,
          updatedAt: new Date(),
          name: existing.name.trim() || department.name,
          description: existing.description.trim() || department.description,
        })
        .where(eq(catalogCollections.id, existing.id));
      continue;
    }
    await db.insert(catalogCollections).values({
      slug: department.slug,
      name: department.name,
      description: department.description,
      sortOrder: department.sortOrder,
      isFeatured: true,
      isActive: true,
    });
  }
}

export async function remapDepartmentCategories(db: EditorialSyncDb) {
  const departments = await db
    .select({ id: catalogCollections.id, slug: catalogCollections.slug })
    .from(catalogCollections)
    .where(inArray(catalogCollections.slug, [...EDITORIAL_COLLECTION_SLUGS]));
  await db.delete(catalogCollectionCategories);

  const categories = await db
    .select({ id: catalogCategories.id, path: catalogCategories.path })
    .from(catalogCategories);
  const categoryByPath = new Map(categories.map((item) => [item.path, item.id]));

  const rows: Array<{ collectionId: string; categoryId: string }> = [];
  for (const department of EDITORIAL_DEPARTMENTS) {
    const collection = departments.find((item) => item.slug === department.slug);
    if (!collection) continue;
    for (const path of department.categoryPaths) {
      const categoryId = categoryByPath.get(path);
      if (categoryId) rows.push({ collectionId: collection.id, categoryId });
    }
  }
  if (rows.length) {
    await db.insert(catalogCollectionCategories).values(rows).onConflictDoNothing();
  }
}

export async function unfeatureNonEditorialCollections(db: EditorialSyncDb) {
  await db
    .update(catalogCollections)
    .set({ isFeatured: false, updatedAt: new Date() })
    .where(notInArray(catalogCollections.slug, [...EDITORIAL_COLLECTION_SLUGS]));
}

export async function deactivateUnknownCollections(db: EditorialSyncDb, allowedSlugs: string[]) {
  const allowed = [...new Set([...EDITORIAL_COLLECTION_SLUGS, ...allowedSlugs])];
  await db
    .update(catalogCollections)
    .set({ isActive: false, isFeatured: false, updatedAt: new Date() })
    .where(notInArray(catalogCollections.slug, allowed));
}

export async function deactivateOrphanCategories(db: EditorialSyncDb) {
  const linked = exists(
    db
      .select({ id: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, catalogCategories.id)),
  );
  await db.update(catalogCategories).set({ isActive: true, updatedAt: new Date() }).where(linked);
  await db.update(catalogCategories).set({ isActive: false, updatedAt: new Date() }).where(notExists(
    db
      .select({ id: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, catalogCategories.id)),
  ));
}

export async function backfillFamilyCollectionIds(db: EditorialSyncDb) {
  const lines = await db
    .select({ id: catalogCollections.id, slug: catalogCollections.slug })
    .from(catalogCollections)
    .where(eq(catalogCollections.isActive, true));
  const b2bLines = lines
    .filter((line) => !isEditorialCollectionSlug(line.slug))
    .sort((a, b) => toJsonLineSlug(b.slug).length - toJsonLineSlug(a.slug).length);

  for (const line of b2bLines) {
    const jsonSlug = toJsonLineSlug(line.slug);
    await db
      .update(productFamilies)
      .set({ collectionId: line.id, updatedAt: new Date() })
      .where(
        and(
          isNull(productFamilies.collectionId),
          or(
            like(productFamilies.slug, `${jsonSlug}-%`),
            like(productFamilies.slug, `${line.slug}-%`),
          ),
        ),
      );
  }
}

export async function syncEditorialCatalog(db: EditorialSyncDb, options: { allowedLineSlugs?: string[] } = {}) {
  await ensureLineSlugSeparation(db);
  await upsertEditorialDepartments(db);
  await unfeatureNonEditorialCollections(db);
  await remapDepartmentCategories(db);
  await deactivateOrphanCategories(db);
  if (options.allowedLineSlugs) {
    await deactivateUnknownCollections(db, options.allowedLineSlugs);
  }
  await backfillFamilyCollectionIds(db);
}
