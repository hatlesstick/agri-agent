import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { findUp } from "@/config";
import type { DatabaseSchema } from "@/database/database.types";

export const MIGRATIONS_DIR = findUp("drizzle", "meta");

export async function runMigrations(db: NodePgDatabase<DatabaseSchema>): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}
