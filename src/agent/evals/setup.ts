import { afterAll } from "vitest";
import { flushAgentTelemetry, registerAgentTelemetry } from "@/agent";

registerAgentTelemetry({ exportMode: "immediate", environment: "evals" });

afterAll(async () => {
  await flushAgentTelemetry();
});
