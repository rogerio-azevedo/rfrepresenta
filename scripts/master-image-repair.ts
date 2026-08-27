import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "@neondatabase/serverless";
import sharp from "sharp";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const endpoint = (process.env.R2_S3_API || "").replace(/\/rfrepresenta\/?$/, "");
const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_ACCESS_SECRET_KEY || "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "rfrepresenta";

interface RawSku {
  id?: string;
  nome?: string;
  preco?: number;
  ean?: string;
  fotoPrincipal?: string;
  fotos?: string[];
  especificacoes?: Record<string, string>;
}

interface RawItem {
  tipo: string;
  tamanho: string;
  medida: string;
  referencia: string;
  vtexSku?: RawSku | null;
}

interface RawGroup {
  id: string;
  name: string;
  foto?: string;
  itens: RawItem[];
}

interface RawCollection {
  slug: string;
  name: string;
  groups: RawGroup[];
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAndNormalizeImage(candidateUrls: string[]): Promise<{ buffer: Buffer; contentType: string } | null> {
  for (const rawUrl of candidateUrls) {
    if (!rawUrl) continue;
    // Replace b2b with catalogo
    const fixedUrl = rawUrl.replace("b2b.altenburg.com.br", "catalogo.altenburg.com.br");
    const cleanUrl = fixedUrl.replace(/&tam=\d+/i, "").replace(/\?tam=\d+/i, "");
    const urlsToTry = [cleanUrl, fixedUrl];

    for (const u of urlsToTry) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(u, {
            headers: {
              Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
            },
            signal: AbortSignal.timeout(15000),
          });

          if (!res.ok) {
            await sleep(200 * (attempt + 1));
            continue;
          }

          const arrayBuffer = await res.arrayBuffer();
          const rawBuffer = Buffer.from(arrayBuffer);

          if (rawBuffer.length < 500) {
            await sleep(200 * (attempt + 1));
            continue;
          }

          // Check if HTML
          if (rawBuffer.subarray(0, 15).toString("utf-8").toLowerCase().includes("<html") ||
              rawBuffer.subarray(0, 15).toString("utf-8").toLowerCase().includes("<!doctype")) {
            await sleep(200 * (attempt + 1));
            continue;
          }

          // Convert to JPEG if PNG or ensure valid JPEG
          let normalizedBuffer: Buffer;
          try {
            const metadata = await sharp(rawBuffer).metadata();
            if (metadata.format === "png" || metadata.format !== "jpeg") {
              normalizedBuffer = await sharp(rawBuffer).jpeg({ quality: 90 }).toBuffer();
            } else {
              normalizedBuffer = rawBuffer;
            }
          } catch {
            normalizedBuffer = rawBuffer;
          }

          return { buffer: normalizedBuffer, contentType: "image/jpeg" };
        } catch {
          await sleep(300 * (attempt + 1));
        }
      }
    }
  }
  return null;
}

async function main() {
  console.log("[MasterSync] Carregando coleções e imagens...");

  const jsonPath = path.resolve(process.cwd(), "data/altenburg-b2b-collections.json");
  const collections = JSON.parse(await fs.readFile(jsonPath, "utf-8")) as RawCollection[];

  const groupMap = new Map<string, RawGroup>();
  for (const c of collections) {
    for (const g of c.groups) {
      groupMap.set(g.id, g);
    }
  }

  const queryRes = await pool.query(
    "SELECT id, product_id, object_key, size_bytes, original_name FROM product_images",
  );
  const allRecords = queryRes.rows;

  const byKey = new Map<string, typeof allRecords>();
  for (const r of allRecords) {
    const list = byKey.get(r.object_key) || [];
    list.push(r);
    byKey.set(r.object_key, list);
  }

  console.log(`[MasterSync] ${allRecords.length} registros no DB, ${byKey.size} chaves únicas.`);

  // Find keys that need repair (either size < 2KB or corrupted)
  const keysToProcess: string[] = [];
  for (const [objectKey, records] of byKey.entries()) {
    const minSize = Math.min(...records.map((r) => r.size_bytes || 0));
    // Ambient photos or small records
    if (minSize < 20000 || objectKey.includes("-ambient-")) {
      keysToProcess.push(objectKey);
    }
  }

  console.log(`[MasterSync] Identificadas ${keysToProcess.length} chaves prioritárias para verificação/reparo.`);

  const CONCURRENCY = 8;
  let index = 0;
  let successCount = 0;
  let failCount = 0;

  async function worker() {
    while (index < keysToProcess.length) {
      const currentIdx = index++;
      const objectKey = keysToProcess[currentIdx];
      const records = byKey.get(objectKey) || [];

      const s3Key = `rfrepresenta/${objectKey}`;

      // Check current S3 state
      let needsUpload = true;
      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: s3Key }));
        if (head.ContentLength && head.ContentLength > 20000 && head.ContentType === "image/jpeg") {
          needsUpload = false;
        }
      } catch {}

      if (!needsUpload) {
        successCount += records.length;
        continue;
      }

      const match = objectKey.match(/products\/altenburg\/([^/]+)\//);
      const groupId = match ? match[1] : null;
      const group = groupId ? groupMap.get(groupId) : null;

      const candidateUrls: string[] = [];
      if (group?.foto) candidateUrls.push(group.foto);
      if (group?.itens) {
        for (const it of group.itens) {
          if (it.vtexSku?.fotoPrincipal) candidateUrls.push(it.vtexSku.fotoPrincipal);
          for (const f of it.vtexSku?.fotos || []) candidateUrls.push(f);
        }
      }

      const normalized = await fetchAndNormalizeImage(candidateUrls);

      if (normalized) {
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: s3Key,
            Body: normalized.buffer,
            ContentType: "image/jpeg",
          }),
        );

        await pool.query(
          "UPDATE product_images SET size_bytes = $1, content_type = $2 WHERE object_key = $3",
          [normalized.buffer.length, "image/jpeg", objectKey],
        );

        console.log(`[${currentIdx + 1}/${keysToProcess.length}] ✓ OK: ${objectKey} (${(normalized.buffer.length / 1024).toFixed(0)} KB)`);
        successCount += records.length;
      } else {
        console.warn(`[${currentIdx + 1}/${keysToProcess.length}] ✗ FALHA: ${objectKey}`);
        failCount += records.length;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log("\n=======================================================");
  console.log(` [MasterSync] CONCLUÍDO!`);
  console.log(` - Registros OK / Reputados: ${successCount}`);
  console.log(` - Registros com falha: ${failCount}`);
  console.log("=======================================================");

  await pool.end();
}

main().catch((err) => {
  console.error("[MasterSync Fatal]", err);
  process.exit(1);
});
