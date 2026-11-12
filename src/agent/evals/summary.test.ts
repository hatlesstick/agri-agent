import { describe, expect, it } from "vitest";
import type { SuiteResult } from "@/agent/evals/report";
import { renderRunSummary } from "@/agent/evals/summary";

const result = (suite: string, rows: SuiteResult["rows"]): SuiteResult => ({
  runId: "ci-42",
  suite,
  model: "google/gemini-2.5-flash-lite",
  createdAt: "2026-11-12T10:00:00.000Z",
  rows,
});

const row = (caseId: string, passed: number, runs: number, extra: Partial<SuiteResult["rows"][number]> = {}) => ({
  suite: "agent",
  case: caseId,
  model: "google/gemini-2.5-flash-lite",
  passed,
  runs,
  failures: "",
  ...extra,
});

describe("renderRunSummary", () => {
  it("renders a heading, a totals line per suite and a row per case", () => {
    const markdown = renderRunSummary("ci-42", [
      result("agent", [
        row("lyon-tomorrow", 3, 3, { avgSteps: 2, avgInputTokens: 1200, avgOutputTokens: 80, p50LatencyMs: 1500, p95LatencyMs: 2400 }),
        row("rain-today", 1, 3, { infraErrors: 1, failures: "canSpray mismatch | pipe" }),
      ]),
    ]);

    expect(markdown).toContain("## Eval run ci-42");
    expect(markdown).toContain("### agent — google/gemini-2.5-flash-lite: 4/6 runs passed");
    expect(markdown).toContain("| lyon-tomorrow | ✅ 3/3 | 0 | 2.0 | 1200/80 | 1500 | 2400 |  |");
    expect(markdown).toContain("| rain-today | ❌ 1/3 | 1 |  |  |  |  | canSpray mismatch \\| pipe |");
  });

  it("marks skipped cases and sorts suites by name", () => {
    const markdown = renderRunSummary("ci-42", [result("rag", [row("off-topic", 0, 0)]), result("agent", [row("a", 1, 1)])]);

    expect(markdown.indexOf("### agent")).toBeLessThan(markdown.indexOf("### rag"));
    expect(markdown).toContain("| off-topic | ⏭ skipped |");
  });

  it("says so when the run produced no results", () => {
    expect(renderRunSummary("ci-42", [])).toBe("## Eval run ci-42\n\nNo eval results were written.\n");
  });
});
