import { LangfuseClient } from "@langfuse/client";
import { isTelemetryEnabled } from "@/agent";
import { serverEnv } from "@/config/env";

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

export function recordScores(traceId: string, scores: Record<string, boolean | number | null>, comment?: string): void {
  const langfuse = scoreClient();
  if (!langfuse) return;

  for (const [name, value] of Object.entries(scores)) {
    if (value === null) continue;
    langfuse.score.create({
      traceId,
      environment: "evals",
      name,
      value: typeof value === "boolean" ? (value ? 1 : 0) : value,
      dataType: typeof value === "boolean" ? "BOOLEAN" : "NUMERIC",
      comment: name === "eval_passed" && comment ? comment : undefined,
    });
  }
}

export async function flushScores(): Promise<void> {
  await client?.score.flush();
}
