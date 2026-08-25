import { z } from "zod";
import { normalizedEmailSchema } from "./common";

export const userAccessInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do usuario.").max(120),
  email: normalizedEmailSchema,
});

export const userIdSchema = z.uuid();
export const clientIdSchema = z.uuid();

export type UserAccessInput = z.infer<typeof userAccessInputSchema>;
