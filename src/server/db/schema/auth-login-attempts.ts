import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const authLoginAttempts = pgTable("auth_login_attempts", {
  keyHash: varchar("key_hash", { length: 64 }).primaryKey(),
  failureCount: integer("failure_count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
