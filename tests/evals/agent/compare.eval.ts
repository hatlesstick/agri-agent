import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import type { EvalRow } from "@tests/evals/report";

const RESULTS_DIR = join(process.cwd(), ".evals", "results");
const IGNORED_MODELS = new Set(["mock", "none"]);

type SuiteResult = { runId: string; suite: string; model: string; rows: EvalRow[] };

function latestResults(): SuiteResult[] {
  if (!existsSync(RESULTS_DIR)) return [];
  const latest = new Map<string, SuiteResult>();
  for (const runId of readdirSync(RESULTS_DIR).sort()) {
    for (const model of readdirSync(join(RESULTS_DIR, runId))) {
      if (IGNORED_MODELS.has(model)) continue;
      for (const file of readdirSync(join(RESULTS_DIR, runId, model))) {
        const result = JSON.parse(readFileSync(join(RESULTS_DIR, runId, model, file), "utf8")) as SuiteResult;
        latest.set(`${result.model}::${result.suite}`, result);
      }
    }
  }
  return [...latest.values()];
}

function cell(row: EvalRow | undefined): string {
  if (!row) return "—";
  if (row.runs === 0) return "skipped";
  const tokens = row.avgInputTokens === undefined ? "" : ` · ${Math.round(row.avgInputTokens + (row.avgOutputTokens ?? 0))} tok`;
  const latency = row.p50LatencyMs === undefined ? "" : ` · ${(row.p50LatencyMs / 1000).toFixed(1)}s`;
  return `${row.passed}/${row.runs}${tokens}${latency}`;
}

describe.skipIf(!process.env.EVAL_COMPARE)("model comparison (latest results per model)", () => {
  it("prints a side-by-side table per suite", () => {
    const results = latestResults();
    const suites = [...new Set(results.map((result) => result.suite))];
    for (const suite of suites) {
      const perModel = results.filter((result) => result.suite === suite);
      const cases = [...new Set(perModel.flatMap((result) => result.rows.map((row) => row.case)))];
      console.log(`\n${suite}`);
      console.table(
        cases.map((caseId) =>
          Object.fromEntries([
            ["case", caseId],
            ...perModel.map((result) => [`${result.model} (${result.runId})`, cell(result.rows.find((row) => row.case === caseId))]),
          ]),
        ),
      );
      for (const result of perModel) {
        const passed = result.rows.reduce((total, row) => total + row.passed, 0);
        const runs = result.rows.reduce((total, row) => total + row.runs, 0);
        const tokens = result.rows.reduce((total, row) => total + (row.avgInputTokens ?? 0) + (row.avgOutputTokens ?? 0), 0);
        console.log(`  ${result.model}: ${passed}/${runs} runs passed, ~${Math.round(tokens)} tokens per case set`);
      }
    }
    if (suites.length === 0) console.log("No real-model results yet. Run npm run eval:real (optionally with EVAL_MODEL=...).");
  });
});
