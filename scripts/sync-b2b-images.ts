import "dotenv/config";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import { slugify } from "../src/server/catalog/normalization";
import {
  catalogCollectionCategories,
  catalogCollections,
  productCategories,
  productImages,
  products,
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

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CONCURRENCY = 8;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSingle(url: string, timeoutMs = 15000) {
  const response = await fetch(url, {
    headers: {
      Accept: "image/*,*/*",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length < 50)
    throw new Error(`Arquivo muito pequeno ou vazio (${body.length} bytes)`);
  if (body.length > MAX_IMAGE_BYTES)
    throw new Error(`Imagem excede ${MAX_IMAGE_BYTES} bytes`);

  const contentType = detectImageMime(
    body,
    response.headers.get("content-type"),
  );
  return { body, contentType };
}

async function fetchImageWithRetry(
  url: string,
): Promise<{ body: Buffer; contentType: string }> {
  const urlsToTry = [url];
  if (url.includes("admin/foto.php") && url.includes("tam=")) {
    urlsToTry.push(url.replace(/[?&]tam=\d+/, ""));
  }

  let lastError: unknown;
  for (const currentUrl of urlsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fetchSingle(currentUrl, 15000);
      } catch (err) {
        lastError = err;
        await sleep(300 * (attempt + 1));
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
const knownR2Keys = new Set<string>();

async function uploadImageToR2(
  url: string,
  prefix: string,
  fileNameSeed: string,
): Promise<UploadedAsset> {
  const cached = uploadedUrlCache.get(url);
  if (cached) return cached;

  const image = await fetchImageWithRetry(url);
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);
  const ext = extensionFor(image.contentType);
  const objectKey = `${prefix}/${slugify(fileNameSeed).slice(0, 80)}-${hash}.${ext}`;
  const s3Key = `rfrepresenta/${objectKey}`;

  if (!knownR2Keys.has(s3Key)) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: s3Key,
        Body: image.body,
        ContentType: image.contentType,
      }),
    );
    knownR2Keys.add(s3Key);
  }

  const asset: UploadedAsset = {
    objectKey,
    contentType: image.contentType,
    sizeBytes: image.body.length,
  };
  uploadedUrlCache.set(url, asset);
  return asset;
}

async function run() {
  console.log("[Sync Images] Lendo banco de dados e dados locais...");
  const rawData = await fs.readFile(inputFile, "utf8");
  const collectionsData = JSON.parse(rawData) as RawCollection[];

  // 1. Get all products from DB mapped by externalId
  const allDbProducts = await db
    .select({ id: products.id, externalId: products.externalId })
    .from(products)
    .where(eq(products.source, "ALTENBURG"));

  const productMap = new Map<string, string>(); // externalId -> id
  for (const p of allDbProducts) {
    if (p.externalId) productMap.set(p.externalId, p.id);
  }

  // 2. Get products that already have images
  const existingImages = await db
    .select({
      productId: productImages.productId,
      objectKey: productImages.objectKey,
    })
    .from(productImages);

  const productWithImages = new Set<string>();
  for (const row of existingImages) {
    productWithImages.add(row.productId);
    knownR2Keys.add(`rfrepresenta/${row.objectKey}`);
  }

  console.log(`[Sync Images] Total de produtos no DB: ${productMap.size}`);
  console.log(
    `[Sync Images] Produtos que já têm imagens: ${productWithImages.size}`,
  );

  type ProductSyncTask = {
    productId: string;
    productName: string;
    prefix: string;
    candidates: Array<{ url: string; seed: string; altText: string }>;
  };

  const tasks: ProductSyncTask[] = [];

  for (const col of collectionsData) {
    for (const group of col.groups) {
      for (let itemIdx = 0; itemIdx < group.itens.length; itemIdx++) {
        const item = group.itens[itemIdx];
        const vtex = item.vtexSku;
        const extId = `${col.slug}-${group.id}-${itemIdx}-${item.referencia || "item"}`;
        const productId = productMap.get(extId);

        if (!productId || productWithImages.has(productId)) continue;

        const productName = vtex?.nome
          ? vtex.nome.trim()
          : `${group.name} - ${item.tipo} ${item.tamanho} ${item.medida}`
              .replace(/\s+/g, " ")
              .trim();

        const candidates: Array<{
          url: string;
          seed: string;
          altText: string;
        }> = [];

        // Ambient photo
        if (group.foto) {
          candidates.push({
            url: group.foto,
            seed: `${group.name}-ambient`,
            altText: productName,
          });
        }

        // Gallery VTEX photos
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

        tasks.push({
          productId,
          productName,
          prefix: `products/altenburg/${group.id}`,
          candidates,
        });
      }
    }
  }

  console.log(
    `[Sync Images] Tarefas pendentes para produtos sem imagem: ${tasks.length}`,
  );

  let completedTasks = 0;
  let savedImages = 0;
  let nextTaskIndex = 0;

  async function worker() {
    while (true) {
      const idx = nextTaskIndex++;
      if (idx >= tasks.length) return;
      const task = tasks[idx];

      let assignedPosition = 0;
      for (const candidate of task.candidates) {
        try {
          const asset = await uploadImageToR2(
            candidate.url,
            task.prefix,
            candidate.seed,
          );
          await db
            .insert(productImages)
            .values({
              productId: task.productId,
              objectKey: asset.objectKey,
              originalName: `${candidate.seed}.${extensionFor(asset.contentType)}`,
              contentType: asset.contentType,
              sizeBytes: asset.sizeBytes,
              altText: candidate.altText,
              position: assignedPosition++,
            })
            .onConflictDoNothing();

          savedImages++;
        } catch (err) {
          // Skip on individual image failure
        }
      }

      completedTasks++;
      if (completedTasks % 50 === 0 || completedTasks === tasks.length) {
        console.log(
          `[Sync Images] ${completedTasks}/${tasks.length} produtos sincronizados (${savedImages} novas imagens associadas).`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Final check
  const finalCheck = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.source, "ALTENBURG"));

  const finalImages = await db
    .select({ productId: productImages.productId })
    .from(productImages);

  const finalSet = new Set(finalImages.map((i) => i.productId));
  const productsWithAtLeastOne = finalCheck.filter((p) =>
    finalSet.has(p.id),
  ).length;

  console.log("\n=======================================================");
  console.log(" 🎉 SINCRONIZAÇÃO DE IMAGENS CONCLUÍDA!");
  console.log(` - Produtos totais: ${finalCheck.length}`);
  console.log(
    ` - Produtos com imagens prontas: ${productsWithAtLeastOne} / ${finalCheck.length}`,
  );
  console.log(` - Imagens totais associadas: ${finalImages.length}`);
  console.log(` - Imagens únicas no R2: ${knownR2Keys.size}`);
  console.log("=======================================================\n");
}

run()
  .catch((err) => {
    console.error("[Sync Images] Erro fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
