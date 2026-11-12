import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SuiteResult } from "@tests/evals/report";
import { renderRunSummary } from "@tests/evals/summary";

const RESULTS_DIR = join(process.cwd(), ".evals", "results");

function latestRunId(): string | undefined {
  if (!existsSync(RESULTS_DIR)) return undefined;
  return readdirSync(RESULTS_DIR).sort().at(-1);
}

function readRun(runId: string): SuiteResult[] {
  const runDir = join(RESULTS_DIR, runId);
  if (!existsSync(runDir)) return [];
  return readdirSync(runDir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(join(runDir, file), "utf8")) as SuiteResult);
}

function main(): void {
  const runId = process.env.EVAL_RUN_ID || latestRunId();
  process.stdout.write(runId ? renderRunSummary(runId, readRun(runId)) : "## Eval run\n\nNo eval results were written.\n");
}

main();
