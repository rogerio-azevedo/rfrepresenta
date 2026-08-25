import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getServerEnv } from "@/server/env";
import * as schema from "./schema";

const pool = new Pool({ connectionString: getServerEnv().DATABASE_URL });

export const db = drizzle({ client: pool, schema });

export type Database = typeof db;
export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];
export type DatabaseExecutor = Database | DatabaseTransaction;
