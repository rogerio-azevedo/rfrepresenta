import "dotenv/config";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { and, asc, eq } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import {
  buildProductSearchText,
  extractFacets,
  slugify,
} from "../src/server/catalog/normalization";
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
  type CatalogCategory,
} from "../src/server/db/schema";

const env = z
  .object({
    DATABASE_URL: z.string().url(),
    R2_S3_API: z.string().url(),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_ACCESS_SECRET_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
  })
  .parse(process.env);

const inputFile = path.resolve("data/altenburg-b2b-collections.json");
const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle({ client: pool });

const endpoint = env.R2_S3_API.replace(/\/rfrepresenta\/?$/, "");
const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_ACCESS_SECRET_KEY,
  },
});

type RawVtexSku = {
  id: string | number;
  nome: string;
  preco: number | null;
  ean: string | null;
  fotoPrincipal: string | null;
  fotos?: string[];
  especificacoes?: Record<string, unknown>;
};

type RawItem = {
  tipo: string;
  referencia: string;
  medida: string;
  tamanho: string;
  raw: string;
  vtexSku: RawVtexSku | null;
};

type RawGroup = {
  id: string;
  name: string;
  foto: string | null;
  downloadUrl: string | null;
  padrao: string | null;
  multiplo: string | null;
  previsao: string | null;
  detalhes: string[];
  itens: RawItem[];
};

type RawCollection = {
  slug: string;
  name: string;
  banner: string | null;
  description: string;
  groupsCount: number;
  groups: RawGroup[];
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_CONCURRENCY = 24;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function detectImageMime(
  buffer: Buffer,
  fallbackHeader: string | null,
): string {
  if (buffer.length >= 4) {
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return "image/png";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "image/jpeg";
    }
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      return "image/webp";
    }
  }

  const cleanHeader = (fallbackHeader || "")
    .split(";", 1)[0]
    .toLowerCase()
    .trim();
  if (
    ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
      cleanHeader,
    )
  ) {
    return cleanHeader;
  }
  return "image/jpeg";
}

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/avif") return "avif";
  return "jpg";
}

async function fetchImage(url: string) {
  const urlsToTry = [url];
  if (url.includes("admin/foto.php") && url.includes("tam=")) {
    urlsToTry.push(url.replace(/[?&]tam=\d+/, ""));
  }

  let lastError: unknown;
  for (const currentUrl of urlsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(currentUrl, {
          headers: {
            Accept: "image/*,*/*",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
          },
          signal: AbortSignal.timeout(25000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = Buffer.from(await response.arrayBuffer());
        if (body.length < 50)
          throw new Error(
            `Arquivo muito pequeno ou vazio (${body.length} bytes)`,
          );
        if (body.length > MAX_IMAGE_BYTES)
          throw new Error(`Imagem excede ${MAX_IMAGE_BYTES} bytes`);

        const contentType = detectImageMime(
          body,
          response.headers.get("content-type"),
        );
        return { body, contentType };
      } catch (error) {
        lastError = error;
        await sleep(300 * 2 ** attempt + Math.round(Math.random() * 150));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao baixar imagem");
}

type UploadedAsset = {
  objectKey: string;
  contentType: string;
  sizeBytes: number;
};
const uploadedUrlCache = new Map<string, UploadedAsset>();

async function uploadImageToR2(
  url: string,
  prefix: string,
  fileNameSeed: string,
): Promise<UploadedAsset> {
  const cached = uploadedUrlCache.get(url);
  if (cached) return cached;

  const image = await fetchImage(url);
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);
  const ext = extensionFor(image.contentType);
  const objectKey = `${prefix}/${slugify(fileNameSeed).slice(0, 80)}-${hash}.${ext}`;
  const s3Key = `rfrepresenta/${objectKey}`;

  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: s3Key,
      }),
    );
  } catch {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: s3Key,
        Body: image.body,
        ContentType: image.contentType,
      }),
    );
  }

  const asset: UploadedAsset = {
    objectKey,
    contentType: image.contentType,
    sizeBytes: image.body.length,
  };
  uploadedUrlCache.set(url, asset);
  return asset;
}

function getCategoryPath(colSlug: string, tipo: string): string {
  const t = (tipo || "").toUpperCase().trim();
  const slug = colSlug.toLowerCase();

  if (slug === "travesseiros") return "Travesseiros";
  if (slug === "protetores") return "Protetores de Colchão e Travesseiro";
  if (slug === "saia-box") return "Saias Box";
  if (slug === "cobertor") return "Cobertores";
  if (slug === "almofadas") return "Almofadas & Rolinhos";
  if (slug.startsWith("banho")) {
    if (t.includes("ROSTO")) return "Banho/Toalhas de Rosto";
    if (t.includes("PISO")) return "Banho/Pisos";
    return "Banho/Toalhas de Banho";
  }

  if (t.startsWith("EDREDOM") || t.includes("EDREDOM")) return "Cama/Edredons";
  if (t.startsWith("JOGO DE COLCHA") || t.includes("COLCHA"))
    return "Cama/Colchas";
  if (t.startsWith("ROUPA DE CAMA") || t.includes("LENÇOL"))
    return "Cama/Jogos de Cama";
  if (t.includes("PORTA TRAVESSEIRO") || t.includes("FRONHA"))
    return "Cama/Porta Travesseiros e Fronhas";
  if (t.includes("MANTA") || t.includes("PESEIRA"))
    return "Cama/Mantas e Peseiras";
  if (t.includes("PILLOW TOP")) return "Cama/Pillow Top";
  if (t.includes("DUVET")) return "Cama/Duvets";
  if (t.includes("ALMOFADA")) return "Almofadas & Rolinhos";

  if (slug === "linha-decor") return "Linha Décor/Acessórios";
  if (slug === "acessorios") return "Cama/Acessórios";
  if (slug === "mundo-kids") return "Mundo Kids/Acessórios";

  return "Cama/Acessórios";
}

const categoryCache = new Map<string, CatalogCategory>();

async function ensureCategory(pathValue: string): Promise<CatalogCategory> {
  const pathClean = pathValue.replace(/^\/|\/$/g, "").trim();
  if (categoryCache.has(pathClean)) return categoryCache.get(pathClean)!;

  const [existing] = await db
    .select()
    .from(catalogCategories)
    .where(eq(catalogCategories.path, pathClean))
    .limit(1);
  if (existing) {
    categoryCache.set(pathClean, existing);
    return existing;
  }

  const segments = pathClean.split("/");
  const parentPath =
    segments.length > 1 ? segments.slice(0, -1).join("/") : null;
  const parent: CatalogCategory | null = parentPath
    ? await ensureCategory(parentPath)
    : null;

  const [created] = await db
    .insert(catalogCategories)
    .values({
      path: pathClean,
      slug: slugify(pathClean),
      name: segments.at(-1) || pathClean,
      parentId: parent?.id || null,
    })
    .onConflictDoNothing({ target: catalogCategories.path })
    .returning();

  if (created) {
    categoryCache.set(pathClean, created);
    return created;
  }

  const [retry] = await db
    .select()
    .from(catalogCategories)
    .where(eq(catalogCategories.path, pathClean))
    .limit(1);
  if (!retry) throw new Error(`Categoria não criada: ${pathClean}`);
  categoryCache.set(pathClean, retry);
  return retry;
}

const usedProductSlugs = new Set<string>();
function createUniqueProductSlug(base: string): string {
  const root = slugify(base).slice(0, 180) || "produto";
  let candidate = root;
  let suffix = 2;
  while (usedProductSlugs.has(candidate)) {
    candidate = `${root}-${suffix++}`;
  }
  usedProductSlugs.add(candidate);
  return candidate;
}

const usedFamilySlugs = new Set<string>();
function createUniqueFamilySlug(base: string): string {
  const root = slugify(base).slice(0, 180) || "familia";
  let candidate = root;
  let suffix = 2;
  while (usedFamilySlugs.has(candidate)) {
    candidate = `${root}-${suffix++}`;
  }
  usedFamilySlugs.add(candidate);
  return candidate;
}

async function run() {
  console.log(`[B2B Import] Lendo arquivo JSON: ${inputFile}...`);
  const rawData = await fs.readFile(inputFile, "utf8");
  const collectionsData = JSON.parse(rawData) as RawCollection[];
  console.log(`[B2B Import] ${collectionsData.length} coleções encontradas.`);

  // 0. Clean old items before fresh import
  console.log("[B2B Import] Limpando dados anteriores de produtos...");
  await db.delete(productFamilyMembers);
  await db.delete(productFamilies);
  await db.delete(productImages);
  await db.delete(productFacets);
  await db.delete(productCategories);
  await db.delete(catalogCollectionCategories);
  await db.delete(products).where(eq(products.source, "ALTENBURG"));

  // Pre-seed all categories
  console.log("[B2B Import] Pré-cadastrando categorias do catálogo...");
  for (const col of collectionsData) {
    for (const g of col.groups) {
      for (const it of g.itens) {
        const catPath = getCategoryPath(col.slug, it.tipo);
        await ensureCategory(catPath);
      }
    }
  }

  // 1. Process and Insert Collections
  console.log("[B2B Import] Cadastrando Coleções e Banners...");
  const collectionDbMap = new Map<string, string>(); // slug -> collectionId

  for (let sortOrder = 0; sortOrder < collectionsData.length; sortOrder++) {
    const col = collectionsData[sortOrder];
    let bannerKey: string | null = null;

    if (col.banner) {
      try {
        const asset = await uploadImageToR2(
          col.banner,
          "assets/collections",
          `${col.slug}-banner`,
        );
        bannerKey = asset.objectKey;
      } catch (err) {
        console.warn(
          `  - Aviso: Falha ao subir banner da coleção ${col.slug}:`,
          err,
        );
      }
    }

    const [existing] = await db
      .select({ id: catalogCollections.id })
      .from(catalogCollections)
      .where(eq(catalogCollections.slug, col.slug))
      .limit(1);

    const values = {
      slug: col.slug,
      name: col.name,
      description: col.description || "",
      imageKey: bannerKey,
      sortOrder,
      isFeatured: true,
      isActive: true,
      updatedAt: new Date(),
    };

    let collectionId: string;
    if (existing) {
      await db
        .update(catalogCollections)
        .set(values)
        .where(eq(catalogCollections.id, existing.id));
      collectionId = existing.id;
    } else {
      const [created] = await db
        .insert(catalogCollections)
        .values(values)
        .returning({ id: catalogCollections.id });
      collectionId = created.id;
    }
    collectionDbMap.set(col.slug, collectionId);
  }

  // 2. Prepare in-memory data structures
  console.log(
    "[B2B Import] Preparando famílias, produtos e filas de imagens...",
  );

  type ProductImageCandidate = {
    url: string;
    seed: string;
    altText: string;
  };

  type ProductImagesToProcess = {
    productId: string;
    prefix: string;
    candidates: ProductImageCandidate[];
  };

  const dbFamilies: Array<typeof productFamilies.$inferInsert> = [];
  const dbProducts: Array<typeof products.$inferInsert> = [];
  const dbFamilyMembers: Array<typeof productFamilyMembers.$inferInsert> = [];
  const dbProductCategories: Array<typeof productCategories.$inferInsert> = [];
  const dbCollectionCategories = new Set<string>(); // "collectionId:categoryId"
  const dbFacets: Array<typeof productFacets.$inferInsert> = [];
  const productImagesQueue: ProductImagesToProcess[] = [];

  for (const col of collectionsData) {
    const collectionId = collectionDbMap.get(col.slug)!;

    for (const group of col.groups) {
      const familyId = crypto.randomUUID();
      const familySlug = createUniqueFamilySlug(`${col.slug}-${group.name}`);
      const familyDesc =
        (group.detalhes || []).join("\n") || col.description || "";
      let firstProductId: string | null = null;

      for (let itemIdx = 0; itemIdx < group.itens.length; itemIdx++) {
        const item = group.itens[itemIdx];
        const vtex = item.vtexSku;
        const productId = crypto.randomUUID();
        if (!firstProductId) firstProductId = productId;

        const extId = `${col.slug}-${group.id}-${itemIdx}-${item.referencia || "item"}`;
        const productName = vtex?.nome
          ? vtex.nome.trim()
          : `${group.name} - ${item.tipo} ${item.tamanho} ${item.medida}`
              .replace(/\s+/g, " ")
              .trim();

        const productSlug = createUniqueProductSlug(
          `${col.slug}-${group.name}-${item.tipo}-${item.tamanho}-${item.referencia}-${itemIdx}`,
        );

        const specs: Record<string, unknown> = {
          ...(vtex?.especificacoes || {}),
          Coleção: col.name,
          Estampa: group.name,
          Tipo: item.tipo,
          Tamanho:
            item.tamanho !== "Padrão"
              ? item.tamanho
              : vtex?.especificacoes?.["Tamanho"] || "Padrão",
          Medida: item.medida || vtex?.especificacoes?.["Largura"] || "",
        };
        if (group.padrao) specs["Padrão"] = group.padrao;
        if (group.multiplo) specs["Múltiplo"] = group.multiplo;
        if (group.previsao) specs["Previsão"] = group.previsao;

        const priceStr = vtex?.preco ? Number(vtex.preco).toFixed(2) : null;
        const searchNormalized = buildProductSearchText({
          name: productName,
          reference: item.referencia,
          ean: vtex?.ean || null,
          brand: "Altenburg",
        });

        dbProducts.push({
          id: productId,
          source: "ALTENBURG",
          externalId: extId,
          slug: productSlug,
          reference: item.referencia || null,
          ean: vtex?.ean || null,
          name: productName,
          searchNormalized,
          description: familyDesc,
          brand: "Altenburg",
          sourcePrice: priceStr,
          salePrice: null,
          cost: null,
          specifications: specs,
          isPublic: true,
        });

        dbFamilyMembers.push({
          familyId,
          productId,
          sortOrder: itemIdx,
        });

        const categoryPath = getCategoryPath(col.slug, item.tipo);
        const category = categoryCache.get(categoryPath);
        if (category) {
          dbProductCategories.push({ productId, categoryId: category.id });
          dbCollectionCategories.add(`${collectionId}:${category.id}`);
        }

        const facets = extractFacets(specs);
        for (const f of facets) {
          dbFacets.push({ productId, ...f });
        }

        // Image candidates for this product (priority 0: ambient, priority 1..N: gallery)
        const candidates: ProductImageCandidate[] = [];
        if (group.foto) {
          candidates.push({
            url: group.foto,
            seed: `${group.name}-ambient`,
            altText: productName,
          });
        }

        if (vtex?.fotos && Array.isArray(vtex.fotos)) {
          let pos = 1;
          for (const vtexUrl of vtex.fotos) {
            if (vtexUrl && vtexUrl !== group.foto) {
              candidates.push({
                url: vtexUrl,
                seed: `${productName}-${pos++}`,
                altText: productName,
              });
            }
          }
        } else if (vtex?.fotoPrincipal && vtex.fotoPrincipal !== group.foto) {
          candidates.push({
            url: vtex.fotoPrincipal,
            seed: `${productName}-1`,
            altText: productName,
          });
        }

        productImagesQueue.push({
          productId,
          prefix: `products/altenburg/${group.id}`,
          candidates,
        });
      }

      dbFamilies.push({
        id: familyId,
        slug: familySlug,
        name: group.name.trim(),
        description: familyDesc,
        brand: "Altenburg",
        reviewStatus: "AUTO_APPROVED",
        defaultProductId: firstProductId,
      });
    }
  }

  // 3. Batch DB insertions
  console.log(
    `[B2B Import] Inserindo ${dbFamilies.length} famílias em lote...`,
  );
  for (const batch of chunkArray(dbFamilies, 100)) {
    await db.insert(productFamilies).values(batch);
  }

  console.log(
    `[B2B Import] Inserindo ${dbProducts.length} produtos em lote...`,
  );
  for (const batch of chunkArray(dbProducts, 100)) {
    await db.insert(products).values(batch);
  }

  console.log(
    `[B2B Import] Inserindo ${dbFamilyMembers.length} vínculos de membros de família...`,
  );
  for (const batch of chunkArray(dbFamilyMembers, 200)) {
    await db.insert(productFamilyMembers).values(batch);
  }

  console.log(
    `[B2B Import] Inserindo ${dbProductCategories.length} vínculos de categorias...`,
  );
  for (const batch of chunkArray(dbProductCategories, 200)) {
    await db.insert(productCategories).values(batch).onConflictDoNothing();
  }

  console.log(
    `[B2B Import] Inserindo ${dbCollectionCategories.size} vínculos de Coleção -> Categoria...`,
  );
  const colCatRows = [...dbCollectionCategories].map((pair) => {
    const [collectionId, categoryId] = pair.split(":");
    return { collectionId, categoryId };
  });
  for (const batch of chunkArray(colCatRows, 200)) {
    await db
      .insert(catalogCollectionCategories)
      .values(batch)
      .onConflictDoNothing();
  }

  console.log(`[B2B Import] Inserindo ${dbFacets.length} facetas de busca...`);
  for (const batch of chunkArray(dbFacets, 400)) {
    await db.insert(productFacets).values(batch).onConflictDoNothing();
  }

  // 4. Concurrently download images, upload to R2, and assign positions per product
  console.log(
    `[B2B Import] Processando imagens de ${productImagesQueue.length} produtos com concorrência de ${IMAGE_CONCURRENCY}...`,
  );

  let totalImagesSaved = 0;
  let nextProductIndex = 0;

  async function productImagesWorker() {
    while (true) {
      const idx = nextProductIndex++;
      if (idx >= productImagesQueue.length) return;
      const item = productImagesQueue[idx];

      let assignedPosition = 0;
      for (const candidate of item.candidates) {
        try {
          const asset = await uploadImageToR2(
            candidate.url,
            item.prefix,
            candidate.seed,
          );
          await db
            .insert(productImages)
            .values({
              productId: item.productId,
              objectKey: asset.objectKey,
              originalName: `${candidate.seed}.${extensionFor(asset.contentType)}`,
              contentType: asset.contentType,
              sizeBytes: asset.sizeBytes,
              altText: candidate.altText,
              position: assignedPosition++,
            })
            .onConflictDoNothing();

          totalImagesSaved++;
        } catch (err) {
          console.warn(
            `[Image Worker] Falha ao processar imagem (${candidate.url}):`,
            err instanceof Error ? err.message : err,
          );
        }
      }

      if (idx > 0 && idx % 100 === 0) {
        console.log(
          `[B2B Import Imagens] ${idx}/${productImagesQueue.length} produtos concluídos (${totalImagesSaved} imagens salvas, ${uploadedUrlCache.size} URLs únicas no R2).`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: IMAGE_CONCURRENCY }, () => productImagesWorker()),
  );

  // 5. Update collection cover images if missing
  for (const col of collectionsData) {
    const collectionId = collectionDbMap.get(col.slug)!;
    const [collectionRow] = await db
      .select({ imageKey: catalogCollections.imageKey })
      .from(catalogCollections)
      .where(eq(catalogCollections.id, collectionId))
      .limit(1);

    if (!collectionRow?.imageKey) {
      const [firstImage] = await db
        .select({ objectKey: productImages.objectKey })
        .from(catalogCollectionCategories)
        .innerJoin(
          productCategories,
          eq(
            productCategories.categoryId,
            catalogCollectionCategories.categoryId,
          ),
        )
        .innerJoin(
          productImages,
          and(
            eq(productImages.productId, productCategories.productId),
            eq(productImages.position, 0),
          ),
        )
        .where(eq(catalogCollectionCategories.collectionId, collectionId))
        .limit(1);

      if (firstImage) {
        await db
          .update(catalogCollections)
          .set({ imageKey: firstImage.objectKey })
          .where(eq(catalogCollections.id, collectionId));
      }
    }
  }

  console.log("\n=======================================================");
  console.log(" 🎉 IMPORTAÇÃO DO CATÁLOGO B2B CONCLUÍDA COM SUCESSO!");
  console.log(` - Coleções B2B criadas/atualizadas: ${collectionsData.length}`);
  console.log(` - Famílias/Estampas criadas: ${dbFamilies.length}`);
  console.log(` - Produtos/SKUs cadastrados: ${dbProducts.length}`);
  console.log(` - Imagens associadas no DB: ${totalImagesSaved}`);
  console.log(` - Imagens únicas enviadas ao R2: ${uploadedUrlCache.size}`);
  console.log("=======================================================\n");
}

run()
  .catch((err) => {
    console.error("[B2B Import] ERRO FATAL:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
