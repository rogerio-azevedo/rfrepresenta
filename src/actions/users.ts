"use server";

import { revalidatePath } from "next/cache";
import { clientIdSchema, userAccessInputSchema, userIdSchema } from "@/schemas/users";
import {
  createClientUserRecord,
  resetClientUserPassword,
  setClientUserStatus,
} from "@/server/dal/users";
import {
  generateTemporaryPassword,
  hashPassword,
} from "@/server/security/passwords";
import type { CredentialActionState } from "./clients";

function userDatabaseError(error: unknown): CredentialActionState {
  const postgresError = error as { code?: string; constraint?: string };
  if (postgresError.code === "23505" && postgresError.constraint?.includes("email")) {
    return { status: "error", errors: { email: ["Este e-mail ja possui acesso."] } };
  }
  return { status: "error", message: "Nao foi possivel salvar o acesso." };
}

export async function createClientUserAction(
  clientId: string,
  _previousState: CredentialActionState,
  formData: FormData,
): Promise<CredentialActionState> {
  const idParsed = clientIdSchema.safeParse(clientId);
  const inputParsed = userAccessInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!idParsed.success || !inputParsed.success) {
    return {
      status: "error",
      message: idParsed.success ? undefined : "Cliente invalido.",
      errors: inputParsed.error?.flatten().fieldErrors,
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  try {
    await createClientUserRecord(idParsed.data, inputParsed.data, passwordHash);
    revalidatePath(`/admin/clientes/${idParsed.data}`);
    return {
      status: "success",
      message: "Acesso criado.",
      temporaryPassword,
    };
  } catch (error) {
    return userDatabaseError(error);
  }
}

export async function resetClientUserPasswordAction(userId: string, clientId: string) {
  const parsedUserId = userIdSchema.parse(userId);
  const parsedClientId = clientIdSchema.parse(clientId);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  await resetClientUserPassword(parsedUserId, passwordHash);
  revalidatePath(`/admin/clientes/${parsedClientId}`);
  return { temporaryPassword };
}

export async function setClientUserStatusAction(
  userId: string,
  clientId: string,
  status: "ACTIVE" | "INACTIVE",
) {
  const parsedUserId = userIdSchema.parse(userId);
  const parsedClientId = clientIdSchema.parse(clientId);
  await setClientUserStatus(parsedUserId, status);
  revalidatePath(`/admin/clientes/${parsedClientId}`);
}
