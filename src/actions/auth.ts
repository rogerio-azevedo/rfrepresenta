"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { changePasswordSchema, loginSchema } from "@/schemas/auth";
import { changeOwnPassword } from "@/server/dal/users";
import { hashPassword } from "@/server/security/passwords";
import type { FormActionState } from "./types";

export async function loginAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const requestedCallback = formData.get("callbackUrl");
  const redirectTo = typeof requestedCallback === "string" && requestedCallback.startsWith("/") && !requestedCallback.startsWith("//")
    ? requestedCallback
    : "/acesso";

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "E-mail ou senha invalidos. Verifique os dados e tente novamente.",
      };
    }
    throw error;
  }

  redirect(redirectTo);
}

export async function changePasswordAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await changeOwnPassword(passwordHash);
  await signOut({ redirectTo: "/login?senha=alterada" });

  return { status: "success" };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
