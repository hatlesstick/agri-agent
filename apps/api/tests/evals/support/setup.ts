import { afterAll } from "vitest";
import { flushAgentTelemetry, registerAgentTelemetry } from "@/observability";
import { flushScores } from "@tests/evals/support/scores";

registerAgentTelemetry({ exportMode: "immediate", environment: "evals" });

afterAll(async () => {
  await flushAgentTelemetry();
  await flushScores();
});
