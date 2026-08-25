import "server-only";

import { hash, verify } from "@node-rs/argon2";
import { randomInt } from "node:crypto";

const passwordHashOptions = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

const temporaryPasswordAlphabet =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

export function generateTemporaryPassword(length = 20) {
  return Array.from(
    { length },
    () => temporaryPasswordAlphabet[randomInt(temporaryPasswordAlphabet.length)],
  ).join("");
}

export function hashPassword(password: string) {
  return hash(password, passwordHashOptions);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password, passwordHashOptions);
}
