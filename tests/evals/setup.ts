import { afterAll } from "vitest";
import { flushAgentTelemetry, registerAgentTelemetry } from "@/agent";
import { flushScores } from "@tests/evals/scores";

registerAgentTelemetry({ exportMode: "immediate", environment: "evals" });

afterAll(async () => {
  await flushAgentTelemetry();
  await flushScores();
});
