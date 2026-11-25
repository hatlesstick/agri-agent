import { defineConfig } from "tsup";

export default defineConfig({
  entry: { main: "src/main.ts", migrate: "src/migrate.ts", "index-docs": "scripts/index-docs.ts" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  dts: false,
});
