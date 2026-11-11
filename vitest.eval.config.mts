import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.eval.ts"],
    setupFiles: ["src/agent/evals/setup.ts"],
    env: loadEnv("", process.cwd(), ""),
    testTimeout: 120_000,
    fileParallelism: false,
    silent: false,
    reporters: ["verbose"],
  },
});
