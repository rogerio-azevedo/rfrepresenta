import "server-only";

import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db, type DatabaseExecutor } from "@/server/db";
import { clients } from "@/server/db/schema";
import type { ClientInput } from "@/schemas/clients";
import { requireAdminContext } from "@/server/auth/context";
import { ResourceNotFoundError } from "@/server/auth/errors";

export async function listClients(search = "", status = "ALL") {
  await requireAdminContext();
  const query = search.trim();
  const filters = [];

  if (query) {
    filters.push(
      or(
        ilike(clients.legalName, `%${query}%`),
        ilike(clients.tradeName, `%${query}%`),
        ilike(clients.taxId, `%${query.replace(/\D/g, "")}%`),
        ilike(clients.externalCode, `%${query}%`),
      ),
    );
  }
  if (status === "ACTIVE" || status === "INACTIVE") {
    filters.push(eq(clients.status, status));
  }

  return db
    .select({
      id: clients.id,
      legalName: clients.legalName,
      tradeName: clients.tradeName,
      taxId: clients.taxId,
      externalCode: clients.externalCode,
      contactName: clients.contactName,
      contactEmail: clients.contactEmail,
      contactPhone: clients.contactPhone,
      status: clients.status,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(clients.legalName));
}

export async function getClientById(clientId: string) {
  await requireAdminContext();
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) throw new ResourceNotFoundError();
  return client;
}

export async function getClientCounts() {
  await requireAdminContext();
  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${clients.status} = 'ACTIVE')::int`,
      inactive: sql<number>`count(*) filter (where ${clients.status} = 'INACTIVE')::int`,
    })
    .from(clients);

  return totals ?? { total: 0, active: 0, inactive: 0 };
}

export async function createClientRecord(
  input: ClientInput,
  executor: DatabaseExecutor = db,
) {
  await requireAdminContext();
  const [client] = await executor.insert(clients).values(input).returning();
  if (!client) throw new Error("Client insert did not return a row");
  return client;
}

export async function updateClientRecord(clientId: string, input: ClientInput) {
  await requireAdminContext();
  const [client] = await db
    .update(clients)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(clients.id, clientId))
    .returning();

  if (!client) throw new ResourceNotFoundError();
  return client;
}

export async function setClientStatus(
  clientId: string,
  status: "ACTIVE" | "INACTIVE",
) {
  await requireAdminContext();
  const [client] = await db
    .update(clients)
    .set({ status, updatedAt: new Date() })
    .where(eq(clients.id, clientId))
    .returning({ id: clients.id });

  if (!client) throw new ResourceNotFoundError();
}
