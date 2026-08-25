import { z } from "zod";
import { normalizedEmailSchema } from "./common";

export const passwordSchema = z
  .string()
  .min(12, "Use pelo menos 12 caracteres.")
  .max(128, "Use no maximo 128 caracteres.");

export const loginSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(1, "Informe sua senha.").max(128),
});

export const changePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao coincidem.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
