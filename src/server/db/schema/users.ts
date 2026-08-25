import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "CLIENT"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    sessionVersion: integer("session_version").notNull().default(1),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
    index("users_client_id_idx").on(table.clientId),
    index("users_role_status_idx").on(table.role, table.status),
    check(
      "users_role_client_check",
      sql`(${table.role} = 'ADMIN' and ${table.clientId} is null) or (${table.role} = 'CLIENT' and ${table.clientId} is not null)`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
