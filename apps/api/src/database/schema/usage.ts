import { date, integer, numeric, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { users } from "@/database/schema/users";

export const usageDaily = pgTable(
  "usage_daily",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date], name: "usage_daily_pk" })],
);
