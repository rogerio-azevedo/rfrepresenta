import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
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
