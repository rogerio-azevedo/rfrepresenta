import "dotenv/config";

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import {
  catalogCollectionCategories,
  productCategories,
  productFacets,
  productFamilies,
  productFamilyMembers,
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

async function cleanR2Products() {
  console.log("[Cleanup] Iniciando limpeza de imagens antigas no R2 (prefixo: rfrepresenta/products/altenburg/)...");
  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listRes = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: "rfrepresenta/products/altenburg/",
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );

    const objects = (listRes.Contents || [])
      .map((c) => (c.Key ? { Key: c.Key } : null))
      .filter(Boolean) as Array<{ Key: string }>;

    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: env.R2_BUCKET_NAME,
          Delete: { Objects: objects, Quiet: true },
        }),
      );
      totalDeleted += objects.length;
      console.log(`[Cleanup R2] Removidos ${totalDeleted} objetos...`);
    }

    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);

  console.log(`[Cleanup R2] CONCLUÍDO: Total de ${totalDeleted} objetos removidos do R2.`);
}

async function cleanDatabaseProducts() {
  console.log("[Cleanup DB] Limpando dados antigos do banco de dados (Neon)...");

  // Delete family relations & families
  await db.delete(productFamilyMembers);
  console.log("  - product_family_members limpo.");
  await db.delete(productFamilies);
  console.log("  - product_families limpo.");

  // Delete images, facets, categories associations
  await db.delete(productImages);
  console.log("  - product_images limpo.");
  await db.delete(productFacets);
  console.log("  - product_facets limpo.");
  await db.delete(productCategories);
  console.log("  - product_categories limpo.");
  await db.delete(catalogCollectionCategories);
  console.log("  - catalog_collection_categories limpo.");

  // Delete Altenburg products
  await db.delete(products).where(eq(products.source, "ALTENBURG"));
  console.log("  - products (source=ALTENBURG) limpo.");

  console.log("[Cleanup DB] CONCLUÍDO: Banco de dados pronto para nova ingestão.");
}

async function run() {
  await cleanR2Products();
  await cleanDatabaseProducts();
  console.log("[Cleanup] Limpeza geral finalizada com sucesso!");
}

run()
  .catch((err) => {
    console.error("[Cleanup] ERRO FATAL:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
