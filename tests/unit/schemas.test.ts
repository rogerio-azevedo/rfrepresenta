import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema, passwordSchema } from "@/schemas/auth";
import { clientInputSchema } from "@/schemas/clients";

const validClient = {
  legalName: "Cliente Comercio Ltda",
  tradeName: "Cliente Loja",
  taxId: "11.222.333/0001-81",
  externalCode: " cli-01 ",
  contactName: "Maria Compradora",
  contactEmail: " COMPRAS@EXAMPLE.COM ",
  contactPhone: "(65) 99999-9999",
};

describe("clientInputSchema", () => {
  it("normalizes a valid commercial profile", () => {
    const result = clientInputSchema.parse(validClient);
    expect(result.taxId).toBe("11222333000181");
    expect(result.externalCode).toBe("CLI-01");
    expect(result.contactEmail).toBe("compras@example.com");
    expect(result.contactPhone).toBe("65999999999");
  });

  it("accepts a valid CPF and rejects invalid documents", () => {
    expect(clientInputSchema.safeParse({ ...validClient, taxId: "529.982.247-25" }).success).toBe(true);
    expect(clientInputSchema.safeParse({ ...validClient, taxId: "11.111.111/1111-11" }).success).toBe(false);
  });
});

describe("auth schemas", () => {
  it("normalizes login email", () => {
    expect(loginSchema.parse({ email: " USER@EXAMPLE.COM ", password: "temporary" }).email).toBe("user@example.com");
  });

  it("requires long matching passwords", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(changePasswordSchema.safeParse({ password: "uma-senha-segura-123", confirmPassword: "outra-senha-segura" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ password: "uma-senha-segura-123", confirmPassword: "uma-senha-segura-123" }).success).toBe(true);
  });
});
