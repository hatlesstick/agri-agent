import { afterAll, afterEach, describe, it, vi } from "vitest";
import { runSprayCheck } from "@/agent";
import { EVAL_TIMEOUT_MS, evalModel, evaluateCase, MOCK, RETRIES_PER_CALL, skipOnMock, tracedRun, type RunOutcome } from "@tests/evals/harness";
import { printEvalReport } from "@tests/evals/report";
import { EVAL_NOW, stubWeatherScenario } from "@tests/evals/scenarios";
import { decisionFailures, toExperimentOutput } from "@tests/evals/experiment";
import { SPRAY_CHECK_CASES, SPRAY_CHECK_SUITE, type SprayCheckCase } from "@tests/evals/spray-check-cases";
import { recordScores } from "@tests/evals/scores";
import { sprayCheckSchema } from "@/agent/spray-check/schemas";
import { weatherRepository } from "@/server/repositories/weather/WeatherRepository";

const SUITE = SPRAY_CHECK_SUITE;

function runOnce(testCase: SprayCheckCase, attempt: number): Promise<RunOutcome> {
  return tracedRun(`eval:spray-check:${testCase.id}`, { evalCase: testCase.id, run: attempt, scenario: testCase.scenario }, async (traceId) => {
    weatherRepository.clearCache();
    stubWeatherScenario(testCase.scenario);
    const outcome = await runSprayCheck({
      question: testCase.question,
      model: evalModel(),
      now: EVAL_NOW,
      maxRetries: RETRIES_PER_CALL,
      timeoutMs: EVAL_TIMEOUT_MS,
      telemetryFunctionId: `eval:spray-check:${testCase.id}`,
    });

    const failures = decisionFailures(toExperimentOutput(outcome, 0), testCase.expected);

    recordScores(
      traceId,
      {
        eval_passed: failures.length === 0,
        schema_valid: outcome.ok ? sprayCheckSchema.safeParse(outcome.result).success : null,
        decision_overridden: outcome.ok ? outcome.overridden : null,
        reason_from_rules: outcome.ok ? outcome.reasonSource === "rules" : null,
        steps: outcome.trace.steps,
      },
      failures.join("; "),
    );
    const metrics = { steps: outcome.trace.steps, inputTokens: outcome.trace.inputTokens, outputTokens: outcome.trace.outputTokens };
    return failures.length === 0 ? { kind: "passed", metrics } : { kind: "failed", failures, metrics };
  });
}

describe(SUITE, () => {
  afterEach(() => vi.unstubAllGlobals());
  afterAll(() => printEvalReport(SUITE));

  it.each(SPRAY_CHECK_CASES)("$id", async (testCase) => {
    if (MOCK && !testCase.runsOnMock) return skipOnMock(SUITE, testCase.id);
    await evaluateCase(SUITE, testCase.id, (attempt) => runOnce(testCase, attempt));
  });
});
