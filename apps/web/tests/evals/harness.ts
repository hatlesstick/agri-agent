import { propagateAttributes, startActiveObservation } from "@langfuse/tracing";
import type { LanguageModel } from "ai";
import { expect } from "vitest";
import { estimateCostUsd } from "@tests/evals/model-pricing";
import { recordEval } from "@tests/evals/report";
import { evalTags } from "@tests/evals/tags";
import { CHAT_MODEL, chatModel, isMockMode } from "@/agent/model";

export const MOCK = isMockMode();
export const EVAL_MODEL = process.env.EVAL_MODEL || CHAT_MODEL;
export const MODEL_LABEL = MOCK ? "mock" : EVAL_MODEL;
export const RUNS = Number(process.env.EVAL_RUNS || (MOCK ? 1 : 3));
export const REQUIRED_PASS_RATE = MOCK ? 1 : 2 / 3;
export const EVAL_RUN_ID = process.env.EVAL_RUN_ID ?? `eval-${new Date().toISOString()}`;
export const EXTRA_TAGS = evalTags(process.env.EVAL_TAGS);
export const RETRIES_PER_CALL = MOCK ? 0 : 4;
export const EVAL_TIMEOUT_MS = 180_000;
export const DEFAULT_MAX_AVG_STEPS = 3;

export type RunMetrics = { steps: number; inputTokens: number; outputTokens: number };

export type RunOutcome =
  | { kind: "passed"; metrics?: RunMetrics }
  | { kind: "failed"; failures: string[]; metrics?: RunMetrics }
  | { kind: "infra"; reason: string };

const INFRA_ERROR = /RateLimit|Rate limit|429|ECONNRESET|ETIMEDOUT|fetch failed|AbortError|Delay was aborted/i;
const DELAY_BETWEEN_RUNS_MS = Number(process.env.EVAL_DELAY_MS || (MOCK ? 0 : 2000));
const INFRA_BACKOFF_MS = MOCK ? 0 : 15_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function evalModel(): LanguageModel {
  return chatModel(EVAL_MODEL);
}

export function errorOutcome(error: unknown): RunOutcome {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return INFRA_ERROR.test(message) ? { kind: "infra", reason: message } : { kind: "failed", failures: [`error: ${message.slice(0, 160)}`] };
}

export function tracedRun(
  name: string,
  metadata: Record<string, unknown>,
  run: (traceId: string) => Promise<RunOutcome>,
): Promise<RunOutcome> {
  return startActiveObservation(name, (observation) =>
    propagateAttributes(
      { traceName: name, sessionId: EVAL_RUN_ID, tags: ["eval", MODEL_LABEL, ...EXTRA_TAGS], metadata: { ...metadata, model: MODEL_LABEL } },
      () => run(observation.traceId),
    ),
  );
}

function average(values: number[]): number | undefined {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : undefined;
}

function percentile(values: number[], fraction: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
}

export type CaseBudget = { maxAvgSteps?: number };

export async function evaluateCase(
  suite: string,
  caseId: string,
  runOnce: (attempt: number) => Promise<RunOutcome>,
  budget: CaseBudget = {},
): Promise<void> {
  const failures: string[] = [];
  const metrics: RunMetrics[] = [];
  const latencies: number[] = [];
  let passed = 0;
  let completed = 0;
  let infraErrors = 0;

  for (let attempt = 0; attempt < RUNS * 3 && completed < RUNS; attempt += 1) {
    if (attempt > 0) await sleep(DELAY_BETWEEN_RUNS_MS);
    const startedAt = performance.now();
    const outcome = await runOnce(attempt).catch(errorOutcome);
    if (outcome.kind === "infra") {
      infraErrors += 1;
      await sleep(INFRA_BACKOFF_MS);
      continue;
    }
    latencies.push(performance.now() - startedAt);
    if (outcome.metrics) metrics.push(outcome.metrics);
    completed += 1;
    if (outcome.kind === "passed") passed += 1;
    else failures.push(...outcome.failures);
  }

  const avgSteps = average(metrics.map((metric) => metric.steps));
  const maxAvgSteps = budget.maxAvgSteps ?? DEFAULT_MAX_AVG_STEPS;
  const overBudget = avgSteps !== undefined && avgSteps > maxAvgSteps;
  if (overBudget) failures.push(`avg steps ${avgSteps.toFixed(1)} > budget ${maxAvgSteps}`);

  const avgInputTokens = average(metrics.map((metric) => metric.inputTokens));
  const avgOutputTokens = average(metrics.map((metric) => metric.outputTokens));

  recordEval({
    suite,
    case: caseId,
    model: MODEL_LABEL,
    passed,
    runs: completed,
    infraErrors,
    failures: completed < RUNS ? `only ${completed}/${RUNS} runs completed` : [...new Set(failures)].join("; "),
    avgSteps,
    avgInputTokens,
    avgOutputTokens,
    avgCostUsd: estimateCostUsd(MODEL_LABEL, avgInputTokens, avgOutputTokens),
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
  });
  expect(completed, "runs completed despite infrastructure errors").toBe(RUNS);
  expect(passed / completed).toBeGreaterThanOrEqual(REQUIRED_PASS_RATE);
  expect(overBudget, `average steps within budget ${maxAvgSteps}`).toBe(false);
}

export function skipOnMock(suite: string, caseId: string): void {
  recordEval({ suite, case: caseId, model: MODEL_LABEL, passed: 0, runs: 0, failures: "skipped: needs a real model" });
}
