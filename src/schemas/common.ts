import { z } from "zod";

export const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail valido."));

export const optionalTextSchema = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  normalizedEmailSchema.optional(),
);

export const optionalPhoneSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const digits = value.replace(/\D/g, "");
    return digits || undefined;
  },
  z
    .string()
    .regex(/^\d{10,11}$/, "Informe um telefone com DDD.")
    .optional(),
);
