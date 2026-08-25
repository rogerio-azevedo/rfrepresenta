import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "@/server/security/passwords";

describe("password helpers", () => {
  it("generates strong one-time passwords", () => {
    const password = generateTemporaryPassword();
    expect(password).toHaveLength(20);
    expect(generateTemporaryPassword()).not.toBe(password);
  });

  it("hashes and verifies without persisting plaintext", async () => {
    const password = "uma-senha-segura-123";
    const passwordHash = await hashPassword(password);
    expect(passwordHash).not.toContain(password);
    await expect(verifyPassword(passwordHash, password)).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "senha-incorreta")).resolves.toBe(false);
  });
});
