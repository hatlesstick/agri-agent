import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const runId = process.env.EVAL_RUN_ID ?? `eval-${new Date().toISOString().replace(/[:.]/g, "-")}`;

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.eval.ts"],
    setupFiles: ["src/test/setup.ts", "src/agent/evals/setup.ts"],
    env: { ...loadEnv("", process.cwd(), ""), EVAL_RUN_ID: runId },
    testTimeout: 120_000,
    fileParallelism: false,
    silent: false,
    reporters: ["verbose"],
  },
});
