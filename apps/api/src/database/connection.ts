import { Logger } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/database/schema";
import type { Database, DatabaseHandle } from "@/database/database.types";

export type PoolLike = Pick<Pool, "query" | "end">;

export const PING_TIMEOUT_MS = 2000;
const CONNECTION_TIMEOUT_MS = 3000;
const STATEMENT_TIMEOUT_MS = 10_000;
const QUERY_TIMEOUT_MS = 12_000;

const logger = new Logger("Database");

const POOL_MAX = 10;
const IDLE_TIMEOUT_MS = 30_000;

export function createPgPool(url: string): PoolLike {
  const pool = new Pool({
    connectionString: url,
    max: POOL_MAX,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    keepAlive: true,
  });
  pool.on("error", (error) => logger.warn(`idle database client error: ${error.message}`));
  return pool;
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

export class LazyDatabase implements DatabaseHandle {
  private pool: PoolLike | null = null;
  private database: Database | null = null;
  private closed = false;

  constructor(
    private readonly url: string,
    private readonly createPool: (url: string) => PoolLike = createPgPool,
  ) {}

  get(): Database {
    if (this.closed) throw new Error("Database connection is closed");
    if (!this.database) {
      this.pool = this.createPool(this.url);
      this.database = drizzle({ client: this.pool as Pool, schema });
    }
    return this.database;
  }

  async ping(): Promise<boolean> {
    try {
      this.get();
      await withTimeout(Promise.resolve(this.pool?.query("select 1")), PING_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    const pool = this.pool;
    this.pool = null;
    this.database = null;
    await pool?.end();
  }
}
