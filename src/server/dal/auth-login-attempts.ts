import "server-only";

import { createHmac } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { authLoginAttempts } from "@/server/db/schema";
import { getServerEnv } from "@/server/env";

const windowMinutes = 15;
const maximumFailures = 5;

export function createLoginAttemptKey(email: string, request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || "unknown";

  return createHmac("sha256", getServerEnv().AUTH_SECRET)
    .update(`${email}|${ip}`)
    .digest("hex");
}

export async function isLoginAllowed(keyHash: string) {
  const [attempt] = await db
    .select({ blockedUntil: authLoginAttempts.blockedUntil })
    .from(authLoginAttempts)
    .where(eq(authLoginAttempts.keyHash, keyHash))
    .limit(1);

  return !attempt?.blockedUntil || attempt.blockedUntil <= new Date();
}

export async function recordLoginFailure(keyHash: string) {
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - windowMinutes * 60_000);
  const blockedUntil = new Date(now.getTime() + windowMinutes * 60_000);

  await db
    .insert(authLoginAttempts)
    .values({
      keyHash,
      failureCount: 1,
      windowStartedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: authLoginAttempts.keyHash,
      set: {
        failureCount: sql`case when ${authLoginAttempts.windowStartedAt} < ${windowCutoff} then 1 else ${authLoginAttempts.failureCount} + 1 end`,
        windowStartedAt: sql`case when ${authLoginAttempts.windowStartedAt} < ${windowCutoff} then ${now} else ${authLoginAttempts.windowStartedAt} end`,
        blockedUntil: sql`case when (case when ${authLoginAttempts.windowStartedAt} < ${windowCutoff} then 1 else ${authLoginAttempts.failureCount} + 1 end) >= ${maximumFailures} then ${blockedUntil} else null end`,
        updatedAt: now,
      },
    });
}

export async function clearLoginFailures(keyHash: string) {
  await db.delete(authLoginAttempts).where(eq(authLoginAttempts.keyHash, keyHash));
}
