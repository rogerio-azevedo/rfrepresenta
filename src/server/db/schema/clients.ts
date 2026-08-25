import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const clientStatusEnum = pgEnum("client_status", ["ACTIVE", "INACTIVE"]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    taxId: text("tax_id").notNull(),
    externalCode: text("external_code"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    status: clientStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("clients_tax_id_unique").on(table.taxId),
    uniqueIndex("clients_external_code_unique")
      .on(table.externalCode)
      .where(sql`${table.externalCode} is not null`),
    index("clients_status_idx").on(table.status),
    index("clients_legal_name_idx").on(table.legalName),
  ],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
