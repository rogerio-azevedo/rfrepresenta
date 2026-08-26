import "dotenv/config";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq, sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import { buildProductSearchText, extractFacets, slugify } from "../src/server/catalog/normalization";
import { catalogCategories, productCategories, productFacets, productImages, products, type CatalogCategory } from "../src/server/db/schema";
import { validateRecord } from "./sync-altenburg-catalog.mjs";

type RecordShape = {
  ID: string;
  REFERENCIA: string | null;
  EAN: string | null;
  NOME: string;
  DESCRICAO: string;
  MARCA: string;
  CATEGORIAS: string[];
  PRECO: number | null;
  FOTOS: string[];
  ESPECIFICACOES: Record<string, unknown>;
};

const env = z.object({
  DATABASE_URL: z.string().url(),
  R2_S3_API: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_ACCESS_SECRET_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
}).parse(process.env);

const inputFile = path.resolve(process.argv[2] || "data/altenburg-products.json");
const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle({ client: pool });
const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_S3_API,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_ACCESS_SECRET_KEY },
});

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PRODUCT_CONCURRENCY = 24;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchImage(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: "image/*", "User-Agent": "RFRepresentaCatalogImport/1.0" }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length > MAX_IMAGE_BYTES) throw new Error(`Imagem excede ${MAX_IMAGE_BYTES} bytes`);
      const contentType = (response.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
      if (!allowedTypes.has(contentType)) throw new Error(`MIME nao permitido: ${contentType || "ausente"}`);
      return { body, contentType };
    } catch (error) {
      lastError = error;
      await sleep(400 * 2 ** attempt + Math.round(Math.random() * 200));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha ao baixar imagem");
}

function extensionFor(contentType: string) {
  return contentType === "image/jpeg" ? "jpg" : contentType.slice("image/".length);
}

function objectKey(externalId: string, position: number, url: string, contentType: string) {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return `products/altenburg/${externalId}/${position}-${hash}.${extensionFor(contentType)}`;
}

async function ensureCategory(pathValue: string): Promise<CatalogCategory> {
  const pathClean = pathValue.replace(/^\/|\/$/g, "").trim();
  const [existing] = await db.select().from(catalogCategories).where(eq(catalogCategories.path, pathClean)).limit(1);
  if (existing) return existing;
  const segments = pathClean.split("/");
  const parentPath = segments.length > 1 ? segments.slice(0, -1).join("/") : null;
  const parent: CatalogCategory | null = parentPath ? await ensureCategory(parentPath) : null;
  const [created] = await db.insert(catalogCategories).values({
    path: pathClean,
    slug: slugify(pathClean),
    name: segments.at(-1) || pathClean,
    parentId: parent?.id || null,
  }).onConflictDoNothing({ target: catalogCategories.path }).returning();
  if (created) return created;
  const [retry] = await db.select().from(catalogCategories).where(eq(catalogCategories.path, pathClean)).limit(1);
  if (!retry) throw new Error(`Categoria nao criada: ${pathClean}`);
  return retry;
}

async function uniqueSlug(base: string) {
  const root = slugify(base).slice(0, 180);
  let candidate = root;
  let suffix = 2;
  while (true) {
    const [match] = await db.select({ id: products.id }).from(products).where(eq(products.slug, candidate)).limit(1);
    if (!match) return candidate;
    candidate = `${root}-${suffix++}`;
  }
}

async function seedCategories(records: RecordShape[]) {
  const paths = new Set(records.flatMap((record) => record.CATEGORIAS));
  for (const categoryPath of [...paths].sort((a, b) => a.split("/").length - b.split("/").length)) await ensureCategory(categoryPath);
}

async function insertProduct(record: RecordShape) {
  const [existing] = await db.select().from(products).where(and(eq(products.source, "ALTENBURG"), eq(products.externalId, record.ID))).limit(1);
  if (existing) return { product: existing, created: false };
  const slug = await uniqueSlug(`${record.NOME}-${record.REFERENCIA || record.ID}`);
  const [product] = await db.insert(products).values({
    source: "ALTENBURG",
    externalId: record.ID,
    slug,
    reference: record.REFERENCIA,
    ean: record.EAN,
    name: record.NOME,
    searchNormalized: buildProductSearchText({ name: record.NOME, reference: record.REFERENCIA, ean: record.EAN, brand: record.MARCA }),
    description: record.DESCRICAO,
    brand: record.MARCA,
    sourcePrice: record.PRECO === null ? null : record.PRECO.toFixed(2),
    salePrice: null,
    cost: null,
    specifications: record.ESPECIFICACOES,
    isPublic: false,
  }).returning();
  if (!product) throw new Error(`Produto nao criado: ${record.ID}`);

  const categories = [];
  for (const categoryPath of record.CATEGORIAS) categories.push(await ensureCategory(categoryPath));
  if (categories.length) await db.insert(productCategories).values(categories.map((category) => ({ productId: product.id, categoryId: category.id }))).onConflictDoNothing();
  const facets = extractFacets(record.ESPECIFICACOES);
  if (facets.length) await db.insert(productFacets).values(facets.map((facet) => ({ productId: product.id, ...facet }))).onConflictDoNothing();
  return { product, created: true };
}

async function importImages(record: RecordShape, productId: string) {
  const failures: string[] = [];
  for (const [position, url] of record.FOTOS.entries()) {
    const existing = await db.select({ id: productImages.id }).from(productImages).where(and(eq(productImages.productId, productId), eq(productImages.position, position))).limit(1);
    if (existing.length) continue;
    try {
      const image = await fetchImage(url);
      const key = objectKey(record.ID, position, url, image.contentType);
      try {
        await s3.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
      } catch {
        await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: image.body, ContentType: image.contentType }));
      }
      await db.insert(productImages).values({
        productId,
        objectKey: key,
        originalName: `${record.ID}-${position}.${extensionFor(image.contentType)}`,
        contentType: image.contentType,
        sizeBytes: image.body.length,
        altText: record.NOME,
        position,
      }).onConflictDoNothing();
    } catch (error) {
      failures.push(`${position}:${error instanceof Error ? error.message : "falha desconhecida"}`);
    }
  }
  return failures;
}

async function run() {
  const records = JSON.parse(await fs.readFile(inputFile, "utf8")) as RecordShape[];
  if (!Array.isArray(records) || !records.length) throw new Error("JSON vazio ou invalido.");
  records.forEach(validateRecord);
  console.log(`[Catalog Import] ${records.length} registros validados.`);
  await seedCategories(records);

  let created = 0;
  let images = 0;
  const failures: Array<{ id: string; errors: string[] }> = [];
  let completed = 0;
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= records.length) return;
      const record = records[index];
      const result = await insertProduct(record);
      if (result.created) created++;
      const imageFailures = await importImages(record, result.product.id);
      const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(productImages).where(eq(productImages.productId, result.product.id));
      images += Number(total);
      if (imageFailures.length) failures.push({ id: record.ID, errors: imageFailures });
      completed++;
      if (completed % 25 === 0 || completed === records.length) console.log(`[Catalog Import] ${completed}/${records.length} produtos; ${images} imagens; ${failures.length} produtos com falha.`);
    }
  }
  await Promise.all(Array.from({ length: PRODUCT_CONCURRENCY }, () => worker()));

  const report = { inputFile, records: records.length, created, images, failures, completedAt: new Date().toISOString() };
  const reportPath = path.resolve("data/altenburg-import-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`[Catalog Import] Relatorio: ${reportPath}`);
  if (failures.length) process.exitCode = 1;
}

run().catch((error) => {
  console.error("[Catalog Import] ERRO FATAL:", error);
  process.exitCode = 1;
}).finally(() => pool.end());
