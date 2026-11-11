import { LangfuseClient } from "@langfuse/client";
import { isTelemetryEnabled } from "@/agent";
import { serverEnv } from "@/config/env";

export type RunScores = {
  passed: boolean;
  toolSelection: boolean;
  toolArguments: boolean | null;
  steps: number;
  comment: string;
};

let client: LangfuseClient | null = null;

function scoreClient(): LangfuseClient | null {
  if (!isTelemetryEnabled()) return null;
  if (!client) {
    const env = serverEnv();
    client = new LangfuseClient({
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      baseUrl: env.LANGFUSE_BASE_URL,
    });
  }
  return client;
}

export function recordRunScores(traceId: string, scores: RunScores): void {
  const langfuse = scoreClient();
  if (!langfuse) return;

  const common = { traceId, environment: "evals" } as const;
  langfuse.score.create({ ...common, name: "eval_passed", value: scores.passed ? 1 : 0, dataType: "BOOLEAN", comment: scores.comment || undefined });
  langfuse.score.create({ ...common, name: "tool_selection", value: scores.toolSelection ? 1 : 0, dataType: "BOOLEAN" });
  if (scores.toolArguments !== null) {
    langfuse.score.create({ ...common, name: "tool_arguments", value: scores.toolArguments ? 1 : 0, dataType: "BOOLEAN" });
  }
  langfuse.score.create({ ...common, name: "steps", value: scores.steps, dataType: "NUMERIC" });
}

export async function flushScores(): Promise<void> {
  await client?.score.flush();
}
