import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  R2_ACCOUNT_ID: z.string().trim().min(1),
  R2_ACCESS_KEY_ID: z.string().trim().min(1),
  R2_ACCESS_SECRET_KEY: z.string().trim().min(1),
  R2_BUCKET_NAME: z.string().trim().min(1),
  R2_PUBLIC_URL: z.url(),
  R2_S3_API: z.url(),
});

const seedEnvSchema = serverEnvSchema.extend({
  INITIAL_ADMIN_EMAIL: z.email(),
  INITIAL_ADMIN_NAME: z.string().trim().min(2).max(120),
});

let serverEnv: z.infer<typeof serverEnvSchema> | undefined;

export function getServerEnv() {
  serverEnv ??= serverEnvSchema.parse(process.env);
  return serverEnv;
}

export function getSeedEnv() {
  return seedEnvSchema.parse(process.env);
}
