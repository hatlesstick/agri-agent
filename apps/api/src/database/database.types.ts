import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/database/schema";

export type DatabaseSchema = typeof schema;

export type Database = PgDatabase<PgQueryResultHKT, DatabaseSchema>;

export type DatabaseHandle = {
  get(): Database;
  ping(): Promise<boolean>;
  close(): Promise<void>;
};
