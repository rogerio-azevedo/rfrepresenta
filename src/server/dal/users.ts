import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { db, type DatabaseExecutor } from "@/server/db";
import { clients, users } from "@/server/db/schema";
import type { UserAccessInput } from "@/schemas/users";
import { requireAdminContext, requireAuthContext } from "@/server/auth/context";
import { ResourceNotFoundError } from "@/server/auth/errors";

export async function findUserForCredentials(email: string) {
  const [user] = await db
    .select({
      id: users.id,
      clientId: users.clientId,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      status: users.status,
      clientStatus: clients.status,
      mustChangePassword: users.mustChangePassword,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .leftJoin(clients, eq(users.clientId, clients.id))
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  return user ?? null;
}

export async function markLoginSuccessful(userId: string) {
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function listClientUsers(clientId: string) {
  await requireAdminContext();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.clientId, clientId), eq(users.role, "CLIENT")))
    .orderBy(asc(users.name));
}

export async function createClientUserRecord(
  clientId: string,
  input: UserAccessInput,
  passwordHash: string,
  executor: DatabaseExecutor = db,
) {
  await requireAdminContext();
  const [user] = await executor
    .insert(users)
    .values({
      clientId,
      name: input.name,
      email: input.email,
      passwordHash,
      role: "CLIENT",
      status: "ACTIVE",
      mustChangePassword: true,
    })
    .returning({ id: users.id });

  if (!user) throw new Error("User insert did not return a row");
  return user;
}

export async function resetClientUserPassword(
  userId: string,
  passwordHash: string,
) {
  await requireAdminContext();
  const [user] = await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: true,
      passwordChangedAt: new Date(),
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), eq(users.role, "CLIENT")))
    .returning({ id: users.id });

  if (!user) throw new ResourceNotFoundError();
}

export async function setClientUserStatus(
  userId: string,
  status: "ACTIVE" | "INACTIVE",
) {
  await requireAdminContext();
  const [user] = await db
    .update(users)
    .set({
      status,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), eq(users.role, "CLIENT")))
    .returning({ id: users.id });

  if (!user) throw new ResourceNotFoundError();
}

export async function changeOwnPassword(passwordHash: string) {
  const context = await requireAuthContext();
  const [user] = await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, context.userId))
    .returning({ id: users.id });

  if (!user) throw new ResourceNotFoundError();
}
