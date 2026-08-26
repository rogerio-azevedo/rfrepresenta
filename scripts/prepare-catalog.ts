import "dotenv/config";

import { and, asc, eq, isNull } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import { deriveFamilyName, familyCandidateKey, familySlug, type FamilyCandidateProduct } from "../src/server/catalog/families";
import {
  catalogCategories,
  catalogCollectionCategories,
  catalogCollections,
  productCategories,
  productFamilies,
  productFamilyMembers,
  productImages,
  products,
} from "../src/server/db/schema";

const env = z.object({ DATABASE_URL: z.string().url() }).parse(process.env);
const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle({ client: pool });

const COLLECTIONS = [
  {
    slug: "cama",
    name: "Cama",
    description: "Jogos de cama, lençóis e complementos para diferentes estilos de loja.",
    matches: (path: string) => /Jogo de Cama|Lençol|Fronha|Porta Travesseiro|Acessórios (?:para Cama|Casal|King|Queen|Solteiro)|Protetor de Colchão|Pillow Top|Saia-Box|Duvet|Seda Mulberry/i.test(path),
  },
  {
    slug: "colchas-edredons",
    name: "Colchas e edredons",
    description: "Camadas de aconchego, acabamento e presença para o ponto de venda.",
    matches: (path: string) => /Jogo de Colcha|Edredom/i.test(path),
  },
  {
    slug: "travesseiros",
    name: "Travesseiros",
    description: "Opções para diferentes posições de dormir, suportes e tecnologias.",
    matches: (path: string) => /(?:^|\/)Travesseiro(?:\/| |$)/.test(path),
  },
  {
    slug: "banho",
    name: "Banho",
    description: "Toalhas e coordenados em diferentes cores, tamanhos e composições.",
    matches: (path: string) => /(?:^|\/)Banho(?:\/|$)|Toalha|Roupão|Banheiro|Relax/i.test(path),
  },
] as const;

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

async function prepareCollections() {
  const categories = await db.select().from(catalogCategories).where(eq(catalogCategories.isActive, true));
  for (const [sortOrder, definition] of COLLECTIONS.entries()) {
    const { matches, ...values } = definition;
    const categoryIds = categories.filter((category) => matches(category.path)).map((category) => category.id);
    const [existing] = await db.select({ id: catalogCollections.id }).from(catalogCollections).where(eq(catalogCollections.slug, definition.slug)).limit(1);
    const [collection] = existing
      ? await db.update(catalogCollections).set({ ...values, sortOrder, isFeatured: true, isActive: true, updatedAt: new Date() }).where(eq(catalogCollections.id, existing.id)).returning()
      : await db.insert(catalogCollections).values({ ...values, sortOrder, isFeatured: true, isActive: true }).returning();
    if (!collection) throw new Error(`Colecao nao criada: ${definition.slug}`);
    await db.delete(catalogCollectionCategories).where(eq(catalogCollectionCategories.collectionId, collection.id));
    if (categoryIds.length) {
      await db.insert(catalogCollectionCategories).values(categoryIds.map((categoryId) => ({ collectionId: collection.id, categoryId })));
    }

    if (!collection.imageKey && categoryIds.length) {
      const [cover] = await db
        .select({ objectKey: productImages.objectKey })
        .from(productCategories)
        .innerJoin(productImages, and(eq(productImages.productId, productCategories.productId), eq(productImages.position, 0)))
        .where(eq(productCategories.categoryId, categoryIds[0]))
        .limit(1);
      if (cover) await db.update(catalogCollections).set({ imageKey: cover.objectKey }).where(eq(catalogCollections.id, collection.id));
    }
  }
  return { collectionsPrepared: COLLECTIONS.length };
}

async function run() {
  const families = await prepareFamilies();
  const collections = await prepareCollections();
  console.log(JSON.stringify({ ...families, ...collections }));
}

run().catch((error) => {
  console.error("[Catalog Prepare]", error);
  process.exitCode = 1;
}).finally(() => pool.end());
