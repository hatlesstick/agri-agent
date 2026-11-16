import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderComparison } from "@tests/evals/comparison";
import type { SuiteResult } from "@tests/evals/report";

const RESULTS_DIR = join(process.cwd(), ".evals", "results");
const OUTPUT_FILE = join(process.cwd(), "docs", "model-comparison.md");

function readAllResults(): SuiteResult[] {
  if (!existsSync(RESULTS_DIR)) return [];
  return readdirSync(RESULTS_DIR, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8")) as SuiteResult);
}

function main(): void {
  const markdown = renderComparison(readAllResults(), new Date().toISOString().slice(0, 10));
  mkdirSync(join(process.cwd(), "docs"), { recursive: true });
  writeFileSync(OUTPUT_FILE, markdown);
  process.stdout.write(`${markdown}\nWritten to docs/model-comparison.md\n`);
}

main();
