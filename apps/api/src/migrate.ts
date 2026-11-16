import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadApiEnv } from "@/config";
import { runMigrations } from "@/database/migrations";
import * as schema from "@/database/schema";

const env = loadApiEnv();
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
try {
  await runMigrations(drizzle({ client: pool, schema }));
  process.stdout.write("migrations applied\n");
} finally {
  await pool.end();
}
