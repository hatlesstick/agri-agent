import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema/*.ts",
  out: "./drizzle",
  strict: true,
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  verbose: false,
});
