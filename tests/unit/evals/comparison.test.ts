import { describe, expect, it } from "vitest";
import { latestPerModelAndSuite, renderComparison } from "@tests/evals/comparison";
import type { EvalRow, SuiteResult } from "@tests/evals/report";

const row = (model: string, caseId: string, passed: number, runs: number, extra: Partial<EvalRow> = {}): EvalRow => ({
  suite: "agent",
  case: caseId,
  model,
  passed,
  runs,
  failures: "",
  ...extra,
});

const result = (model: string, suite: string, runId: string, rows: EvalRow[]): SuiteResult => ({
  runId,
  suite,
  model,
  createdAt: `${runId.slice(5)}T00:00:00.000Z`,
  rows,
});

const GEMINI = "google/gemini-2.5-flash-lite";
const NOVA = "amazon/nova-lite";

describe("latestPerModelAndSuite", () => {
  it("keeps the newest run per model and suite and ignores mock and deterministic runs", () => {
    const older = result(GEMINI, "agent", "eval-2026-11-10", [row(GEMINI, "a", 1, 3)]);
    const newer = result(GEMINI, "agent", "eval-2026-11-12", [row(GEMINI, "a", 3, 3)]);
    const mock = result("mock", "agent", "eval-2026-11-12", [row("mock", "a", 1, 1)]);
    const none = result("none", "rag", "eval-2026-11-12", [row("none", "a", 1, 1)]);

    expect(latestPerModelAndSuite([newer, older, mock, none])).toEqual([newer]);
  });
});

describe("renderComparison", () => {
  const results = [
    result(GEMINI, "agent", "eval-2026-11-12", [
      row(GEMINI, "lyon", 3, 3, { avgCostUsd: 0.0002, p50LatencyMs: 1000, p95LatencyMs: 2000, avgInputTokens: 1500, avgOutputTokens: 100 }),
      row(GEMINI, "rain", 2, 3, { avgCostUsd: 0.0004, p50LatencyMs: 3000, p95LatencyMs: 5000, infraErrors: 1, failures: "canSpray mismatch" }),
    ]),
    result(NOVA, "agent", "eval-2026-11-11", [
      row(NOVA, "lyon", 1, 3, { avgCostUsd: 0.0001, p50LatencyMs: 800, p95LatencyMs: 900 }),
      row(NOVA, "skipped", 0, 0),
    ]),
  ];
  const markdown = renderComparison(results, "2026-11-12");

  it("renders an overview row per model with pass rate, cost, latency and infra errors", () => {
    expect(markdown).toContain("# Model comparison");
    expect(markdown).toContain("| amazon/nova-lite | 1/3 (33%) | 1/3 (33%) | $0.000100 | 800 | 900 | 0 | eval-2026-11-11 |");
    expect(markdown).toContain("| google/gemini-2.5-flash-lite | 5/6 (83%) | 5/6 (83%) | $0.000300 | 2000 | 5000 | 1 | eval-2026-11-12 |");
  });

  it("renders a per-case table per suite with a column per model", () => {
    expect(markdown).toContain("## agent");
    expect(markdown).toContain("| case | amazon/nova-lite | google/gemini-2.5-flash-lite |");
    expect(markdown).toContain("| lyon | ❌ 1/3 | ✅ 3/3 |");
    expect(markdown).toContain("| rain | — | ❌ 2/3 |");
    expect(markdown).toContain("| skipped | ⏭ skipped | — |");
  });

  it("explains how the numbers were produced", () => {
    expect(markdown).toContain("Generated on 2026-11-12");
    expect(markdown).toContain("prices checked on");
  });

  it("renders a template with instructions when there are no real-model results", () => {
    const empty = renderComparison([], "2026-11-12");
    expect(empty).toContain("No real-model results yet");
    expect(empty).toContain("EVAL_MODEL=amazon/nova-lite npm run eval:real");
  });
});
