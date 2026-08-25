"use server";

import { revalidatePath } from "next/cache";
import { clientInputSchema } from "@/schemas/clients";
import { clientIdSchema, userAccessInputSchema } from "@/schemas/users";
import { db } from "@/server/db";
import {
  createClientRecord,
  setClientStatus,
  updateClientRecord,
} from "@/server/dal/clients";
import { createClientUserRecord } from "@/server/dal/users";
import {
  generateTemporaryPassword,
  hashPassword,
} from "@/server/security/passwords";
import type { FormActionState } from "./types";

export type CredentialActionState = FormActionState & {
  temporaryPassword?: string;
  clientId?: string;
};

function readClientInput(formData: FormData) {
  return {
    legalName: formData.get("legalName"),
    tradeName: formData.get("tradeName"),
    taxId: formData.get("taxId"),
    externalCode: formData.get("externalCode"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
  };
}

function databaseErrorState(error: unknown): FormActionState {
  const postgresError = error as { code?: string; constraint?: string };
  if (postgresError.code === "23505") {
    if (postgresError.constraint?.includes("tax_id")) {
      return { status: "error", errors: { taxId: ["Este documento ja esta cadastrado."] } };
    }
    if (postgresError.constraint?.includes("email")) {
      return { status: "error", errors: { email: ["Este e-mail ja possui acesso."] } };
    }
    if (postgresError.constraint?.includes("external_code")) {
      return { status: "error", errors: { externalCode: ["Este codigo ja esta em uso."] } };
    }
  }
  return { status: "error", message: "Nao foi possivel salvar. Tente novamente." };
}

export async function createClientAction(
  _previousState: CredentialActionState,
  formData: FormData,
): Promise<CredentialActionState> {
  const clientParsed = clientInputSchema.safeParse(readClientInput(formData));
  const userParsed = userAccessInputSchema.safeParse({
    name: formData.get("userName"),
    email: formData.get("userEmail"),
  });

  if (!clientParsed.success || !userParsed.success) {
    return {
      status: "error",
      errors: {
        ...clientParsed.error?.flatten().fieldErrors,
        userName: userParsed.error?.flatten().fieldErrors.name,
        userEmail: userParsed.error?.flatten().fieldErrors.email,
      },
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  try {
    const clientId = await db.transaction(async (transaction) => {
      const client = await createClientRecord(clientParsed.data, transaction);
      await createClientUserRecord(
        client.id,
        userParsed.data,
        passwordHash,
        transaction,
      );
      return client.id;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/clientes");
    return {
      status: "success",
      message: "Cliente e acesso criados.",
      temporaryPassword,
      clientId,
    };
  } catch (error) {
    return databaseErrorState(error);
  }
}

export async function updateClientAction(
  clientId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const idParsed = clientIdSchema.safeParse(clientId);
  const parsed = clientInputSchema.safeParse(readClientInput(formData));
  if (!idParsed.success || !parsed.success) {
    return {
      status: "error",
      errors: parsed.error?.flatten().fieldErrors,
      message: idParsed.success ? undefined : "Cliente invalido.",
    };
  }

  try {
    await updateClientRecord(idParsed.data, parsed.data);
    revalidatePath(`/admin/clientes/${idParsed.data}`);
    revalidatePath("/admin/clientes");
    return { status: "success", message: "Cadastro atualizado." };
  } catch (error) {
    return databaseErrorState(error);
  }
}

export async function setClientStatusAction(
  clientId: string,
  status: "ACTIVE" | "INACTIVE",
) {
  const id = clientIdSchema.parse(clientId);
  await setClientStatus(id, status);
  revalidatePath("/admin");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
}
