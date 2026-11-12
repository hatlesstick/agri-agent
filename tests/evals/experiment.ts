import type { SprayCheckOutcome } from "@/agent";
import { slug } from "@tests/evals/slug";
import { sameWindow, SPRAY_CHECK_CASES, type SprayCheckCase, type SprayCheckExpected } from "@tests/evals/spray-check-cases";
import { EVAL_NOW, type WeatherScenario } from "@tests/evals/weather-fixtures";

export const SPRAY_CHECK_DATASET = "agri-agent-spray-check";

export type SprayCheckItemInput = { question: string; scenario: WeatherScenario; now: string };

export type SprayCheckItemMetadata = { suite: "spray-check"; caseId: string; runsOnMock: boolean };

export type SprayCheckDatasetItem = {
  id: string;
  input: SprayCheckItemInput;
  expectedOutput: SprayCheckExpected;
  metadata: SprayCheckItemMetadata;
};

export type SprayCheckExperimentOutput = {
  ok: boolean;
  city?: string;
  canSpray?: boolean;
  bestWindow?: { from: string; to: string } | null;
  error?: string;
  steps: number;
  toolCalls: string[];
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

export type ExperimentEvaluation = { name: string; value: number; comment?: string };

export function sprayCheckDatasetItems(cases: SprayCheckCase[] = SPRAY_CHECK_CASES, now: Date = EVAL_NOW): SprayCheckDatasetItem[] {
  return cases.map((testCase) => ({
    id: `${SPRAY_CHECK_DATASET}:${slug(testCase.id)}`,
    input: { question: testCase.question, scenario: testCase.scenario, now: now.toISOString() },
    expectedOutput: testCase.expected,
    metadata: { suite: "spray-check", caseId: testCase.id, runsOnMock: testCase.runsOnMock },
  }));
}

export function toExperimentOutput(outcome: SprayCheckOutcome, latencyMs: number): SprayCheckExperimentOutput {
  const usage = {
    steps: outcome.trace.steps,
    toolCalls: outcome.trace.toolCalls.map((call) => call.toolName),
    inputTokens: outcome.trace.inputTokens,
    outputTokens: outcome.trace.outputTokens,
    latencyMs,
  };
  if (!outcome.ok) return { ok: false, error: outcome.error, ...usage };
  const { city, canSpray, bestWindow } = outcome.result;
  return { ok: true, city, canSpray, bestWindow, ...usage };
}

export function decisionFailures(output: SprayCheckExperimentOutput, expected: SprayCheckExpected): string[] {
  const failures: string[] = [];
  if (expected.ok !== output.ok) return [output.ok ? "expected an error" : `error=${output.error}`];
  if (!expected.ok && output.error !== expected.error) failures.push(`error=${output.error}`);
  if (expected.ok && output.ok) {
    if (output.canSpray !== expected.canSpray) failures.push(`canSpray=${output.canSpray}`);
    if (!sameWindow(output.bestWindow ?? null, expected.bestWindow)) failures.push(`bestWindow=${JSON.stringify(output.bestWindow ?? null)}`);
    if (expected.city && output.city !== expected.city) failures.push(`city=${output.city}`);
  }
  return failures;
}

export function itemEvaluations(output: SprayCheckExperimentOutput, expected: SprayCheckExpected): ExperimentEvaluation[] {
  const failures = decisionFailures(output, expected);
  const calledSprayWindow = output.toolCalls.includes("sprayWindow");
  return [
    { name: "rule_consistency", value: failures.length === 0 ? 1 : 0, comment: failures.join("; ") },
    { name: "tool_usage", value: calledSprayWindow === expected.ok ? 1 : 0 },
    { name: "steps", value: output.steps },
    { name: "latency_ms", value: output.latencyMs },
  ];
}

export function passRateEvaluation(ruleConsistency: number[]): ExperimentEvaluation {
  const passed = ruleConsistency.filter((value) => value === 1).length;
  return {
    name: "pass_rate",
    value: ruleConsistency.length ? passed / ruleConsistency.length : 0,
    comment: `${passed}/${ruleConsistency.length} items consistent with the rules`,
  };
}
