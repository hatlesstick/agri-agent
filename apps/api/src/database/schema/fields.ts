import { sql } from "drizzle-orm";
import { check, doublePrecision, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "@/database/schema/users";

export const fields = pgTable(
  "fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    crop: text("crop"),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    areaHa: numeric("area_ha", { precision: 10, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("fields_user_id_name_unique").on(table.userId, sql`lower(btrim(${table.name}))`),
    check("fields_lat_range", sql`${table.lat} between -90 and 90`),
    check("fields_lon_range", sql`${table.lon} between -180 and 180`),
    check("fields_area_non_negative", sql`${table.areaHa} is null or ${table.areaHa} >= 0`),
  ],
);
