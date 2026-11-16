import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Database } from "@/database";
import { MIGRATIONS_DIR, runMigrations } from "@/database/migrations";
import * as schema from "@/database/schema";

export type TestDatabase = { db: Database; reset(): Promise<void>; close(): Promise<void> };

const TABLES = sql.raw("audit_log, pending_actions, messages, conversations, fields, identities, usage_daily, users");

async function onPostgres(url: string): Promise<TestDatabase> {
  const pool = new Pool({ connectionString: url, max: 5 });
  const db = drizzleNodePg({ client: pool, schema });
  await runMigrations(db);
  return {
    db: db as unknown as Database,
    reset: async () => {
      await db.execute(sql`truncate table ${TABLES} restart identity cascade`);
    },
    close: () => pool.end(),
  };
}

async function onPglite(): Promise<TestDatabase> {
  const client = new PGlite();
  const db = drizzlePglite({ client, schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_DIR });
  return {
    db: db as unknown as Database,
    reset: async () => {
      await db.execute(sql`truncate table ${TABLES} restart identity cascade`);
    },
    close: () => client.close(),
  };
}

export function testDatabase(): Promise<TestDatabase> {
  const url = process.env.TEST_DATABASE_URL;
  return url ? onPostgres(url) : onPglite();
}
