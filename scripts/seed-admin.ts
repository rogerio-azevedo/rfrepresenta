import "dotenv/config";

import { Pool } from "@neondatabase/serverless";
import { hash } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { users } from "../src/server/db/schema/users";

async function main() {
  const seedEnv = z
    .object({
      DATABASE_URL: z.string().url(),
      INITIAL_ADMIN_EMAIL: z
        .string()
        .email()
        .transform((email) => email.toLowerCase()),
      INITIAL_ADMIN_NAME: z.string().trim().min(2).max(120),
      INITIAL_ADMIN_PASSWORD: z.string().min(8).optional(),
    })
    .parse(process.env);

  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const temporaryPassword =
    seedEnv.INITIAL_ADMIN_PASSWORD ||
    Array.from({ length: 20 }, () => alphabet[randomInt(alphabet.length)]).join(
      "",
    );

  const pool = new Pool({ connectionString: seedEnv.DATABASE_URL });
  const database = drizzle({ client: pool });

  try {
    const [existingAdmin] = await database
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${seedEnv.INITIAL_ADMIN_EMAIL}`)
      .limit(1);

    if (existingAdmin) {
      console.log("Admin inicial ja existe; nenhuma alteracao foi feita.");
    } else {
      const passwordHash = await hash(temporaryPassword, {
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
        outputLen: 32,
      });

      const isCustomPassword = Boolean(seedEnv.INITIAL_ADMIN_PASSWORD);

      await database.insert(users).values({
        name: seedEnv.INITIAL_ADMIN_NAME,
        email: seedEnv.INITIAL_ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        mustChangePassword: !isCustomPassword,
      });

      console.log(
        `Admin criado com sucesso para ${seedEnv.INITIAL_ADMIN_EMAIL}`,
      );
      if (isCustomPassword) {
        console.log(
          "Senha inicial configurada a partir do .env (troca obrigatoria: desativada).",
        );
      } else {
        console.log(`Senha provisoria (exibida uma vez): ${temporaryPassword}`);
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Erro ao executar seed do admin:", error);
  process.exit(1);
});
