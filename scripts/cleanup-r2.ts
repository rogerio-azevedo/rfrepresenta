import "dotenv/config";

import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { asc, eq } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import { r2DeletionQueue } from "../src/server/db/schema";

const env = z.object({
  DATABASE_URL: z.string().url(),
  R2_S3_API: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_ACCESS_SECRET_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
}).parse(process.env);
const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle({ client: pool });
const s3 = new S3Client({ region: "auto", endpoint: env.R2_S3_API, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_ACCESS_SECRET_KEY } });

async function run() {
  const items = await db.select().from(r2DeletionQueue).orderBy(asc(r2DeletionQueue.createdAt));
  let removed = 0;
  for (const item of items) {
    await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: item.objectKey }));
    await db.delete(r2DeletionQueue).where(eq(r2DeletionQueue.objectKey, item.objectKey));
    removed++;
  }
  console.log(`[R2 Cleanup] ${removed} objetos removidos.`);
}

run().catch((error) => { console.error("[R2 Cleanup] ERRO:", error); process.exitCode = 1; }).finally(() => pool.end());
