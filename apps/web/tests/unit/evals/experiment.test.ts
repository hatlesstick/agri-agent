import { describe, expect, it } from "vitest";
import type { SprayCheckOutcome } from "@/agent";
import {
  decisionFailures,
  itemEvaluations,
  passRateEvaluation,
  SPRAY_CHECK_DATASET,
  sprayCheckDatasetItems,
  toExperimentOutput,
} from "@tests/evals/experiment";
import { SPRAY_CHECK_CASES } from "@tests/evals/spray-check-cases";

const trace = { steps: 2, inputTokens: 1200, outputTokens: 90, toolCalls: [{ toolName: "sprayWindow", input: { city: "Lyon" } }] };

const calm: SprayCheckOutcome = {
  ok: true,
  result: { city: "Lyon", canSpray: true, bestWindow: { from: "2026-11-12T00:00", to: "2026-11-13T00:00" }, reason: "Calm day" },
  overridden: false,
  reasonSource: "model",
  trace,
};

const calmExpected = { ok: true as const, canSpray: true, bestWindow: { from: "2026-11-12T00:00", to: "2026-11-13T00:00" }, city: "Lyon" };

describe("sprayCheckDatasetItems", () => {
  it("builds one item per spray-check case with stable, project-unique ids", () => {
    const items = sprayCheckDatasetItems();

    expect(items).toHaveLength(SPRAY_CHECK_CASES.length);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(items[0]).toEqual({
      id: "agri-agent-spray-check:calm-day-canspray-true-whole-day-window",
      input: { question: "Can I spray in Lyon tomorrow?", scenario: "calm", now: "2026-11-11T08:30:00.000Z" },
      expectedOutput: calmExpected,
      metadata: { suite: "spray-check", caseId: SPRAY_CHECK_CASES[0].id, runsOnMock: true },
    });
    expect(items.every((item) => item.id.startsWith(`${SPRAY_CHECK_DATASET}:`) && item.id.length <= 255)).toBe(true);
  });
});

describe("toExperimentOutput and decisionFailures", () => {
  it("keeps the decision, tools and usage of a run", () => {
    expect(toExperimentOutput(calm, 1234)).toEqual({
      ok: true,
      city: "Lyon",
      canSpray: true,
      bestWindow: { from: "2026-11-12T00:00", to: "2026-11-13T00:00" },
      steps: 2,
      toolCalls: ["sprayWindow"],
      inputTokens: 1200,
      outputTokens: 90,
      latencyMs: 1234,
    });
  });

  it("reports every mismatch against the expected decision", () => {
    const output = toExperimentOutput({ ...calm, result: { ...calm.result, canSpray: false, bestWindow: null, city: "Paris" } }, 10);

    expect(decisionFailures(output, calmExpected)).toEqual(["canSpray=false", "bestWindow=null", "city=Paris"]);
    expect(decisionFailures(toExperimentOutput(calm, 10), calmExpected)).toEqual([]);
    expect(decisionFailures(toExperimentOutput(calm, 10), { ok: false, error: "spray_window_not_called" })).toEqual(["expected an error"]);
  });
});

describe("itemEvaluations", () => {
  it("scores rule consistency, tool usage, steps and latency", () => {
    expect(itemEvaluations(toExperimentOutput(calm, 1500), calmExpected)).toEqual([
      { name: "rule_consistency", value: 1, comment: "" },
      { name: "tool_usage", value: 1 },
      { name: "steps", value: 2 },
      { name: "latency_ms", value: 1500 },
    ]);
  });

  it("fails tool usage when sprayWindow is called for an off-topic question", () => {
    const evaluations = itemEvaluations(toExperimentOutput(calm, 10), { ok: false, error: "spray_window_not_called" });

    expect(evaluations[0]).toEqual({ name: "rule_consistency", value: 0, comment: "expected an error" });
    expect(evaluations[1]).toEqual({ name: "tool_usage", value: 0 });
  });
});

describe("passRateEvaluation", () => {
  it("averages rule consistency across items", () => {
    expect(passRateEvaluation([1, 0, 1, 1])).toEqual({ name: "pass_rate", value: 0.75, comment: "3/4 items consistent with the rules" });
    expect(passRateEvaluation([])).toEqual({ name: "pass_rate", value: 0, comment: "0/0 items consistent with the rules" });
  });
});
