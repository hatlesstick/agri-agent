import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/server-env.ts", "src/testing/index.ts"],
  format: ["esm"],
  dts: true,
  target: "node22",
  sourcemap: true,
  clean: true,
});
