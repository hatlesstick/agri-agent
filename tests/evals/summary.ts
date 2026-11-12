import type { EvalRow, SuiteResult } from "@tests/evals/report";

const HEADER = "| case | pass rate | infra errors | avg steps | tokens in/out | p50 ms | p95 ms | failures |\n|---|---|---|---|---|---|---|---|";

function number(value: number | undefined, digits: number): string {
  return value === undefined || Number.isNaN(value) ? "" : value.toFixed(digits);
}

function cellText(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
}

function passCell(row: EvalRow): string {
  if (row.runs === 0) return "⏭ skipped";
  return `${row.passed === row.runs ? "✅" : "❌"} ${row.passed}/${row.runs}`;
}

function caseLine(row: EvalRow): string {
  const tokens = row.avgInputTokens === undefined ? "" : `${number(row.avgInputTokens, 0)}/${number(row.avgOutputTokens, 0)}`;
  const cells = [
    row.case,
    passCell(row),
    String(row.infraErrors ?? 0),
    number(row.avgSteps, 1),
    tokens,
    number(row.p50LatencyMs, 0),
    number(row.p95LatencyMs, 0),
    cellText(row.failures),
  ];
  return `| ${cells.join(" | ")} |`;
}

function suiteSection(result: SuiteResult): string {
  const passed = result.rows.reduce((total, row) => total + row.passed, 0);
  const runs = result.rows.reduce((total, row) => total + row.runs, 0);
  return [`### ${result.suite} — ${result.model}: ${passed}/${runs} runs passed`, "", HEADER, ...result.rows.map(caseLine)].join("\n");
}

export function renderRunSummary(runId: string, results: SuiteResult[]): string {
  const heading = `## Eval run ${runId}\n\n`;
  if (results.length === 0) return `${heading}No eval results were written.\n`;
  const sections = [...results].sort((left, right) => left.suite.localeCompare(right.suite)).map(suiteSection);
  return `${heading}${sections.join("\n\n")}\n`;
}
