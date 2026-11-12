import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";

export type EvalRow = {
  suite: string;
  case: string;
  model: string;
  passed: number;
  runs: number;
  infraErrors?: number;
  failures: string;
  avgSteps?: number;
  avgInputTokens?: number;
  avgOutputTokens?: number;
  p50LatencyMs?: number;
  p95LatencyMs?: number;
};

export type SuiteResult = { runId: string; suite: string; model: string; createdAt: string; rows: EvalRow[] };

const RESULTS_DIR = join(process.cwd(), ".evals", "results");
export const BASELINES_DIR = join(process.cwd(), "src", "agent", "evals", "baselines");
const REGRESSION_DROP = 0.5;
const STEPS_WARNING_INCREASE = 1;

const rows: EvalRow[] = [];

export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function recordEval(row: EvalRow): void {
  rows.push(row);
}

function passRate(row: Pick<EvalRow, "passed" | "runs">): number {
  return row.runs === 0 ? Number.NaN : row.passed / row.runs;
}

function format(value: number | undefined, digits = 1): string {
  return value === undefined || Number.isNaN(value) ? "" : value.toFixed(digits);
}

function writeResult(result: SuiteResult): void {
  const dir = join(RESULTS_DIR, result.runId, slug(result.model));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${slug(result.suite)}.json`), `${JSON.stringify(result, null, 2)}\n`);
}

function readBaseline(suite: string, model: string): SuiteResult | null {
  const file = join(BASELINES_DIR, slug(model), `${slug(suite)}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as SuiteResult) : null;
}

function compareWithBaseline(current: EvalRow[], baseline: SuiteResult | null): { regressions: string[]; warnings: string[] } {
  if (!baseline) return { regressions: [], warnings: [] };
  const regressions: string[] = [];
  const warnings: string[] = [];
  for (const row of current) {
    const before = baseline.rows.find((candidate) => candidate.case === row.case);
    if (!before || row.runs === 0 || before.runs === 0) continue;
    const drop = passRate(before) - passRate(row);
    if (drop >= REGRESSION_DROP) regressions.push(`${row.case}: ${before.passed}/${before.runs} → ${row.passed}/${row.runs}`);
    if ((row.avgSteps ?? 0) - (before.avgSteps ?? 0) >= STEPS_WARNING_INCREASE) {
      warnings.push(`${row.case}: avg steps ${format(before.avgSteps)} → ${format(row.avgSteps)}`);
    }
  }
  return { regressions, warnings };
}

export function printEvalReport(suite: string): void {
  const suiteRows = rows.filter((row) => row.suite === suite);
  if (suiteRows.length === 0) return;

  const model = suiteRows[0].model;
  const runId = process.env.EVAL_RUN_ID ?? "local";
  const passed = suiteRows.reduce((total, row) => total + row.passed, 0);
  const runs = suiteRows.reduce((total, row) => total + row.runs, 0);

  console.log(`\n${suite}: ${passed}/${runs} runs passed`);
  console.table(
    suiteRows.map((row) => ({
      case: row.case,
      model: row.model,
      "pass rate": `${row.passed}/${row.runs}`,
      "infra errors": row.infraErrors ?? 0,
      steps: format(row.avgSteps),
      "tokens in/out": row.avgInputTokens === undefined ? "" : `${format(row.avgInputTokens, 0)}/${format(row.avgOutputTokens, 0)}`,
      "p50 ms": format(row.p50LatencyMs, 0),
      failures: row.failures,
    })),
  );

  writeResult({ runId, suite, model, createdAt: new Date().toISOString(), rows: suiteRows });

  const { regressions, warnings } = compareWithBaseline(suiteRows, readBaseline(suite, model));
  for (const warning of warnings) console.warn(`[eval warning] ${warning}`);
  for (const regression of regressions) console.error(`[eval regression] ${regression}`);
  expect(regressions, "regressions against the committed baseline").toEqual([]);
}
