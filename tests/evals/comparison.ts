import { COMPARISON_MODELS, PRICES_CHECKED_ON } from "@tests/evals/model-pricing";
import type { EvalRow, SuiteResult } from "@tests/evals/report";

const NON_MODEL_LABELS = new Set(["mock", "none"]);

export function latestPerModelAndSuite(results: SuiteResult[]): SuiteResult[] {
  const latest = new Map<string, SuiteResult>();
  for (const result of results) {
    if (NON_MODEL_LABELS.has(result.model)) continue;
    const key = `${result.model}::${result.suite}`;
    const current = latest.get(key);
    if (!current || result.runId > current.runId) latest.set(key, result);
  }
  return [...latest.values()];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function defined(values: Array<number | undefined>): number[] {
  return values.filter((value): value is number => value !== undefined);
}

function passCell(rows: EvalRow[]): string {
  const runs = sum(rows.map((row) => row.runs));
  if (runs === 0) return "—";
  const passed = sum(rows.map((row) => row.passed));
  return `${passed}/${runs} (${Math.round((passed / runs) * 100)}%)`;
}

function caseCell(row: EvalRow | undefined): string {
  if (!row) return "—";
  if (row.runs === 0) return "⏭ skipped";
  return `${row.passed === row.runs ? "✅" : "❌"} ${row.passed}/${row.runs}`;
}

function cost(value: number | undefined): string {
  return value === undefined ? "—" : `$${value.toFixed(6)}`;
}

function milliseconds(value: number | undefined): string {
  return value === undefined ? "—" : value.toFixed(0);
}

function overview(models: string[], suites: string[], results: SuiteResult[]): string {
  const header = `| model | ${suites.join(" | ")} | total | avg cost / case | p50 ms | p95 ms | infra errors | runs |`;
  const divider = `|${" --- |".repeat(suites.length + 7)}`;
  const lines = models.map((model) => {
    const own = results.filter((result) => result.model === model);
    const rows = own.flatMap((result) => result.rows);
    const perSuite = suites.map((suite) => passCell(own.filter((result) => result.suite === suite).flatMap((result) => result.rows)));
    const costs = defined(rows.map((row) => row.avgCostUsd));
    const avgCost = costs.length ? sum(costs) / costs.length : undefined;
    const p50 = median(defined(rows.map((row) => row.p50LatencyMs)));
    const p95s = defined(rows.map((row) => row.p95LatencyMs));
    const runIds = [...new Set(own.map((result) => result.runId))].sort().join(", ");
    const infra = sum(rows.map((row) => row.infraErrors ?? 0));
    return `| ${model} | ${perSuite.join(" | ")} | ${passCell(rows)} | ${cost(avgCost)} | ${milliseconds(p50)} | ${milliseconds(p95s.length ? Math.max(...p95s) : undefined)} | ${infra} | ${runIds} |`;
  });
  return [header, divider, ...lines].join("\n");
}

function suiteSection(suite: string, models: string[], results: SuiteResult[]): string {
  const own = results.filter((result) => result.suite === suite);
  const cases = [...new Set(own.flatMap((result) => result.rows.map((row) => row.case)))];
  const header = `| case | ${models.join(" | ")} |`;
  const divider = `|${" --- |".repeat(models.length + 1)}`;
  const lines = cases.map((caseId) => {
    const cells = models.map((model) => caseCell(own.find((result) => result.model === model)?.rows.find((row) => row.case === caseId)));
    return `| ${caseId} | ${cells.join(" | ")} |`;
  });
  return [`## ${suite}`, "", header, divider, ...lines].join("\n");
}

function emptyTemplate(generatedOn: string): string {
  const commands = COMPARISON_MODELS.map((model) => `EVAL_MODEL=${model} npm run eval:real`).join("\n");
  return [
    "# Model comparison",
    "",
    `Generated on ${generatedOn}. No real-model results yet.`,
    "",
    "Run the real-model evals once per model, then regenerate this page:",
    "",
    "```",
    commands,
    "npm run eval:compare",
    "```",
    "",
  ].join("\n");
}

export function renderComparison(results: SuiteResult[], generatedOn: string): string {
  const latest = latestPerModelAndSuite(results);
  if (latest.length === 0) return emptyTemplate(generatedOn);

  const models = [...new Set(latest.map((result) => result.model))].sort();
  const suites = [...new Set(latest.map((result) => result.suite))].sort();
  return [
    "# Model comparison",
    "",
    `Generated on ${generatedOn} from the latest real-model run per model and suite (\`.evals/results\`).`,
    "",
    overview(models, suites, latest),
    "",
    `- Pass rate: passed runs / completed runs; each case runs several times with fixed weather fixtures, so the expected answer is known.`,
    `- Cost: estimated from average tokens × AI Gateway list prices (prices checked on ${PRICES_CHECKED_ON}); real billing may differ.`,
    "- p50: median of per-case medians; p95: the slowest per-case p95.",
    "- Infra errors: rate limits and timeouts, retried and excluded from the pass rate.",
    "",
    ...suites.map((suite) => `${suiteSection(suite, models, latest)}\n`),
  ].join("\n");
}
