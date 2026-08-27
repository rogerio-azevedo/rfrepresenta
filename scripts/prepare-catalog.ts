import "dotenv/config";

import { and, asc, eq, isNull } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import { deriveFamilyName, familyCandidateKey, familySlug, type FamilyCandidateProduct } from "../src/server/catalog/families";
import { syncEditorialCatalog } from "../src/server/catalog/editorial-sync";
import {
  catalogCategories,
  productCategories,
  productFamilies,
  productFamilyMembers,
  products,
} from "../src/server/db/schema";

const env = z.object({ DATABASE_URL: z.string().url() }).parse(process.env);
const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle({ client: pool });

async function prepareFamilies() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      brand: products.brand,
      specifications: products.specifications,
      categoryPath: catalogCategories.path,
      assignedFamilyId: productFamilyMembers.familyId,
    })
    .from(products)
    .leftJoin(productCategories, eq(productCategories.productId, products.id))
    .leftJoin(catalogCategories, eq(catalogCategories.id, productCategories.categoryId))
    .leftJoin(productFamilyMembers, eq(productFamilyMembers.productId, products.id))
    .where(isNull(productFamilyMembers.familyId))
    .orderBy(asc(products.name));

  const productsById = new Map<string, FamilyCandidateProduct>();
  for (const row of rows) {
    const product = productsById.get(row.id) ?? {
      id: row.id,
      name: row.name,
      description: row.description,
      brand: row.brand,
      specifications: row.specifications,
      categoryPaths: [],
    };
    if (row.categoryPath) product.categoryPaths.push(row.categoryPath);
    productsById.set(row.id, product);
  }

  const groups = new Map<string, FamilyCandidateProduct[]>();
  for (const product of productsById.values()) {
    const key = familyCandidateKey(product);
    const group = groups.get(key) ?? [];
    group.push(product);
    groups.set(key, group);
  }

  const prepared = [...groups].map(([candidateKey, members]) => {
    members.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const representative = members[0];
    const familyId = crypto.randomUUID();
    return {
      family: {
        id: familyId,
        slug: familySlug(deriveFamilyName(representative), candidateKey),
        name: deriveFamilyName(representative),
        description: representative.description,
        brand: representative.brand,
        reviewStatus: members.length > 1 ? "AUTO_APPROVED" as const : "NEEDS_REVIEW" as const,
        defaultProductId: representative.id,
      },
      members: members.map((member, sortOrder) => ({ familyId, productId: member.id, sortOrder })),
    };
  });

  const batchSize = 100;
  for (let start = 0; start < prepared.length; start += batchSize) {
    const batch = prepared.slice(start, start + batchSize);
    await db.transaction(async (transaction) => {
      await transaction.insert(productFamilies).values(batch.map((item) => item.family));
      await transaction.insert(productFamilyMembers).values(batch.flatMap((item) => item.members));
    });
    console.log(`[Catalog Prepare] ${Math.min(start + batchSize, prepared.length)}/${prepared.length} familias criadas.`);
  }
  return { familiesCreated: prepared.length, productsAssigned: productsById.size };
}

async function run() {
  const families = await prepareFamilies();
  await syncEditorialCatalog(db);
  console.log(JSON.stringify({ ...families, editorialDepartments: 4 }));
}

run().catch((error) => {
  console.error("[Catalog Prepare]", error);
  process.exitCode = 1;
}).finally(() => pool.end());
