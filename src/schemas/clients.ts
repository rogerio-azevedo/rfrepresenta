import { cnpj, cpf } from "cpf-cnpj-validator";
import { z } from "zod";
import {
  optionalEmailSchema,
  optionalPhoneSchema,
  optionalTextSchema,
} from "./common";

export const clientInputSchema = z.object({
  legalName: z.string().trim().min(2, "Informe a razao social.").max(180),
  tradeName: optionalTextSchema(180),
  taxId: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => cpf.isValid(value) || cnpj.isValid(value), {
      message: "Informe um CPF ou CNPJ valido.",
    }),
  externalCode: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().toUpperCase().max(40).optional(),
  ),
  contactName: optionalTextSchema(120),
  contactEmail: optionalEmailSchema,
  contactPhone: optionalPhoneSchema,
});

export type ClientInput = z.infer<typeof clientInputSchema>;
