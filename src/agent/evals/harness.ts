import { propagateAttributes, startActiveObservation } from "@langfuse/tracing";
import { expect } from "vitest";
import { recordEval } from "@/agent/evals/report";
import { CHAT_MODEL, isMockMode } from "@/agent/model";

export const MOCK = isMockMode();
export const MODEL_LABEL = MOCK ? "mock" : CHAT_MODEL;
export const RUNS = Number(process.env.EVAL_RUNS ?? (MOCK ? 1 : 3));
export const REQUIRED_PASS_RATE = MOCK ? 1 : 2 / 3;
export const EVAL_RUN_ID = `eval-${new Date().toISOString()}`;
export const RETRIES_PER_CALL = MOCK ? 0 : 4;

export type RunOutcome = { kind: "passed" } | { kind: "failed"; failures: string[] } | { kind: "infra"; reason: string };

const INFRA_ERROR = /RateLimit|Rate limit|429|ECONNRESET|ETIMEDOUT|fetch failed/i;
const DELAY_BETWEEN_RUNS_MS = Number(process.env.EVAL_DELAY_MS ?? (MOCK ? 0 : 2000));
const INFRA_BACKOFF_MS = MOCK ? 0 : 15_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function errorOutcome(error: unknown): RunOutcome {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return INFRA_ERROR.test(message) ? { kind: "infra", reason: message } : { kind: "failed", failures: [`error: ${message.slice(0, 160)}`] };
}

export function streamErrorOutcome(message: string): RunOutcome {
  return INFRA_ERROR.test(message) ? { kind: "infra", reason: message } : { kind: "failed", failures: [`stream error: ${message.slice(0, 160)}`] };
}

export function tracedRun(
  name: string,
  metadata: Record<string, unknown>,
  run: (traceId: string) => Promise<RunOutcome>,
): Promise<RunOutcome> {
  return startActiveObservation(name, (observation) =>
    propagateAttributes(
      { traceName: name, sessionId: EVAL_RUN_ID, tags: ["eval", MODEL_LABEL], metadata: { ...metadata, model: MODEL_LABEL } },
      () => run(observation.traceId),
    ),
  );
}

export async function evaluateCase(suite: string, caseId: string, runOnce: (attempt: number) => Promise<RunOutcome>): Promise<void> {
  const failures: string[] = [];
  let passed = 0;
  let completed = 0;
  let infraErrors = 0;

  for (let attempt = 0; attempt < RUNS * 3 && completed < RUNS; attempt += 1) {
    if (attempt > 0) await sleep(DELAY_BETWEEN_RUNS_MS);
    const outcome = await runOnce(attempt).catch(errorOutcome);
    if (outcome.kind === "infra") {
      infraErrors += 1;
      await sleep(INFRA_BACKOFF_MS);
      continue;
    }
    completed += 1;
    if (outcome.kind === "passed") passed += 1;
    else failures.push(...outcome.failures);
  }

  recordEval({
    suite,
    case: caseId,
    model: MODEL_LABEL,
    passed,
    runs: completed,
    infraErrors,
    failures: completed < RUNS ? `only ${completed}/${RUNS} runs completed` : [...new Set(failures)].join("; "),
  });
  expect(completed, "runs completed despite infrastructure errors").toBe(RUNS);
  expect(passed / completed).toBeGreaterThanOrEqual(REQUIRED_PASS_RATE);
}

export function skipOnMock(suite: string, caseId: string): void {
  recordEval({ suite, case: caseId, model: MODEL_LABEL, passed: 0, runs: 0, failures: "skipped: needs a real model" });
}
