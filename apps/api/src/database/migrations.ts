import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { findUp } from "@/config";
import type { DatabaseSchema } from "@/database/database.types";
import * as schema from "@/database/schema";

export const MIGRATIONS_DIR = findUp("drizzle", "meta");

export async function runMigrations(db: NodePgDatabase<DatabaseSchema>): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}

export async function migrateDatabase(url: string): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    await runMigrations(drizzle({ client: pool, schema }));
  } finally {
    await pool.end();
  }
}
