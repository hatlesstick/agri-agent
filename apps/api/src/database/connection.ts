import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/database/schema";
import type { Database, DatabaseHandle } from "@/database/database.types";

export type PoolLike = Pick<Pool, "query" | "end">;

const POOL_MAX = 10;
const IDLE_TIMEOUT_MS = 30_000;

export function createPgPool(url: string): PoolLike {
  return new Pool({ connectionString: url, max: POOL_MAX, idleTimeoutMillis: IDLE_TIMEOUT_MS });
}

export class LazyDatabase implements DatabaseHandle {
  private pool: PoolLike | null = null;
  private database: Database | null = null;

  constructor(
    private readonly url: string,
    private readonly createPool: (url: string) => PoolLike = createPgPool,
  ) {}

  get(): Database {
    if (!this.database) {
      this.pool = this.createPool(this.url);
      this.database = drizzle({ client: this.pool as Pool, schema });
    }
    return this.database;
  }

  async ping(): Promise<boolean> {
    try {
      this.get();
      await this.pool?.query("select 1");
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    const pool = this.pool;
    this.pool = null;
    this.database = null;
    await pool?.end();
  }
}
