import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts", "src/migrate.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  dts: false,
});
