import "server-only";

import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { clients, users } from "@/server/db/schema";
import { AuthenticationError, AuthorizationError } from "./errors";

export type AdminContext = {
  kind: "admin";
  userId: string;
  name: string;
  email: string;
  role: "ADMIN";
  clientId: null;
  clientName: null;
  mustChangePassword: boolean;
};

export type ClientContext = {
  kind: "client";
  userId: string;
  name: string;
  email: string;
  role: "CLIENT";
  clientId: string;
  clientName: string;
  mustChangePassword: boolean;
};

export type AuthContext = AdminContext | ClientContext;

export const getCurrentContext = cache(async (): Promise<AuthContext | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      clientId: users.clientId,
      clientName: clients.tradeName,
      clientLegalName: clients.legalName,
      clientStatus: clients.status,
      mustChangePassword: users.mustChangePassword,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .leftJoin(clients, eq(users.clientId, clients.id))
    .where(and(eq(users.id, session.user.id), eq(users.status, "ACTIVE")))
    .limit(1);

  if (!row || row.sessionVersion !== session.user.sessionVersion) return null;

  if (row.role === "ADMIN" && row.clientId === null) {
    return {
      kind: "admin",
      userId: row.id,
      name: row.name,
      email: row.email,
      role: "ADMIN",
      clientId: null,
      clientName: null,
      mustChangePassword: row.mustChangePassword,
    };
  }

  if (
    row.role === "CLIENT" &&
    row.clientId &&
    row.clientStatus === "ACTIVE"
  ) {
    return {
      kind: "client",
      userId: row.id,
      name: row.name,
      email: row.email,
      role: "CLIENT",
      clientId: row.clientId,
      clientName: row.clientName ?? row.clientLegalName ?? "Cliente",
      mustChangePassword: row.mustChangePassword,
    };
  }

  return null;
});

export async function requireAuthContext() {
  const context = await getCurrentContext();
  if (!context) throw new AuthenticationError();
  return context;
}

export async function requireAdminContext() {
  const context = await requireAuthContext();
  if (context.kind !== "admin") throw new AuthorizationError();
  return context;
}

export async function requireClientContext() {
  const context = await requireAuthContext();
  if (context.kind !== "client") throw new AuthorizationError();
  return context;
}
