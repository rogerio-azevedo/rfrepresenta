import "dotenv/config";

import { Pool } from "@neondatabase/serverless";
import { hash } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { users } from "../src/server/db/schema/users";

const adminSeedSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .email()
    .transform((email) => email.toLowerCase()),
  password: z.string().min(8).optional(),
});

function generateTemporaryPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from({ length: 20 }, () => alphabet[randomInt(alphabet.length)]).join(
    "",
  );
}

async function seedAdmin(
  database: ReturnType<typeof drizzle>,
  admin: z.infer<typeof adminSeedSchema>,
) {
  const [existingAdmin] = await database
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${admin.email}`)
    .limit(1);

  if (existingAdmin) {
    console.log(`Admin ${admin.email} ja existe; nenhuma alteracao foi feita.`);
    return;
  }

  const password = admin.password || generateTemporaryPassword();
  const passwordHash = await hash(password, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
  const isCustomPassword = Boolean(admin.password);

  await database.insert(users).values({
    name: admin.name,
    email: admin.email,
    passwordHash,
    role: "ADMIN",
    status: "ACTIVE",
    mustChangePassword: !isCustomPassword,
  });

  console.log(`Admin criado com sucesso para ${admin.email}`);
  if (isCustomPassword) {
    console.log(
      "Senha inicial configurada a partir do .env (troca obrigatoria: desativada).",
    );
  } else {
    console.log(`Senha provisoria (exibida uma vez): ${password}`);
  }
}

async function main() {
  const seedEnv = z
    .object({
      DATABASE_URL: z.string().url(),
      INITIAL_ADMIN_EMAIL: z.string().email(),
      INITIAL_ADMIN_NAME: z.string().trim().min(2).max(120),
      INITIAL_ADMIN_PASSWORD: z.string().min(8).optional(),
      SECOND_ADMIN_EMAIL: z.string().email().optional(),
      SECOND_ADMIN_NAME: z.string().trim().min(2).max(120).optional(),
      SECOND_ADMIN_PASSWORD: z.string().min(8).optional(),
    })
    .refine(
      (env) => !env.SECOND_ADMIN_EMAIL || Boolean(env.SECOND_ADMIN_NAME),
      {
        message: "SECOND_ADMIN_NAME e obrigatorio quando SECOND_ADMIN_EMAIL esta definido.",
        path: ["SECOND_ADMIN_NAME"],
      },
    )
    .parse(process.env);

  const admins = [
    adminSeedSchema.parse({
      name: seedEnv.INITIAL_ADMIN_NAME,
      email: seedEnv.INITIAL_ADMIN_EMAIL,
      password: seedEnv.INITIAL_ADMIN_PASSWORD,
    }),
  ];

  if (seedEnv.SECOND_ADMIN_EMAIL && seedEnv.SECOND_ADMIN_NAME) {
    admins.push(
      adminSeedSchema.parse({
        name: seedEnv.SECOND_ADMIN_NAME,
        email: seedEnv.SECOND_ADMIN_EMAIL,
        password: seedEnv.SECOND_ADMIN_PASSWORD,
      }),
    );
  }

  const pool = new Pool({ connectionString: seedEnv.DATABASE_URL });
  const database = drizzle({ client: pool });

  try {
    for (const admin of admins) {
      await seedAdmin(database, admin);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Erro ao executar seed do admin:", error);
  process.exit(1);
});
