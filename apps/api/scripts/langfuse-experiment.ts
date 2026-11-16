import { parseArgs } from "node:util";
import { createAgentPorts, runSprayCheck } from "@/modules/agent";
import { flushAgentTelemetry, registerAgentTelemetry } from "@/observability";
import { isMockMode } from "@/config";
import { CHAT_MODEL, chatModel } from "@/modules/agent";
import {
  itemEvaluations,
  passRateEvaluation,
  SPRAY_CHECK_DATASET,
  sprayCheckDatasetItems,
  toExperimentOutput,
  type SprayCheckExperimentOutput,
  type SprayCheckItemInput,
  type SprayCheckItemMetadata,
} from "@tests/evals/experiment";
import { requireLangfuseClient } from "@tests/evals/langfuse-client";
import { promptVersion } from "@tests/evals/prompt-version";
import type { SprayCheckExpected } from "@tests/evals/spray-check-cases";
import { scenarioFetch } from "@tests/evals/weather-fixtures";

const ports = createAgentPorts();
const weatherRepository = ports.weather;


const RETRIES_PER_CALL = 4;
const TIMEOUT_MS = 180_000;

type TaskRunner = (input: SprayCheckItemInput) => Promise<SprayCheckExperimentOutput>;

function createTaskRunner(modelId: string): TaskRunner {
  const realFetch = globalThis.fetch;
  const model = chatModel(modelId);
  return async ({ question, scenario, now }) => {
    weatherRepository.clearCache();
    globalThis.fetch = scenarioFetch(scenario, realFetch);
    const startedAt = performance.now();
    try {
      const outcome = await runSprayCheck({
        question,
        ports: ports,
        model,
        now: new Date(now),
        maxRetries: RETRIES_PER_CALL,
        timeoutMs: TIMEOUT_MS,
        telemetryFunctionId: "experiment:spray-check",
      });
      return toExperimentOutput(outcome, Math.round(performance.now() - startedAt));
    } finally {
      globalThis.fetch = realFetch;
    }
  };
}

async function dryRun(runTask: TaskRunner, mock: boolean): Promise<void> {
  const items = sprayCheckDatasetItems().filter((item) => !mock || item.metadata.runsOnMock);
  const consistency: number[] = [];
  for (const item of items) {
    const evaluations = itemEvaluations(await runTask(item.input), item.expectedOutput);
    consistency.push(evaluations[0].value);
    console.log(`${evaluations[0].value === 1 ? "✅" : "❌"} ${item.metadata.caseId}`, evaluations.map((evaluation) => `${evaluation.name}=${evaluation.value}`).join(" "));
  }
  console.log(passRateEvaluation(consistency).comment);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      model: { type: "string", default: CHAT_MODEL },
      name: { type: "string" },
      "prompt-version": { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const mock = isMockMode();
  const modelId = values.model;
  const version = values["prompt-version"] ?? promptVersion();
  const modelLabel = mock ? "mock" : modelId;
  const runTask = createTaskRunner(modelId);

  if (values["dry-run"]) return dryRun(runTask, mock);

  registerAgentTelemetry({ exportMode: "immediate", environment: "experiments" });
  const langfuse = requireLangfuseClient();
  const dataset = await langfuse.dataset.get(SPRAY_CHECK_DATASET);
  const items = dataset.items.filter((item) => !mock || (item.metadata as SprayCheckItemMetadata | null)?.runsOnMock);
  const result = await langfuse.experiment.run({
    name: values.name ?? `spray-check · ${modelLabel}`,
    description: `Spray-check decisions with ${modelLabel}, prompt ${version}`,
    metadata: { model: modelLabel, promptVersion: version, mock },
    data: items,
    maxConcurrency: 1,
    task: async ({ input }) => runTask(input as SprayCheckItemInput),
    evaluators: [
      async ({ output, expectedOutput }) => itemEvaluations(output as SprayCheckExperimentOutput, expectedOutput as SprayCheckExpected),
    ],
    runEvaluators: [
      async ({ itemResults }) =>
        passRateEvaluation(itemResults.map((item) => Number(item.evaluations.find((evaluation) => evaluation.name === "rule_consistency")?.value ?? 0))),
    ],
  });

  console.log(await result.format());
  await flushAgentTelemetry();
  await langfuse.flush();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
