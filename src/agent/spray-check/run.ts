import { NoObjectGeneratedError, type LanguageModel } from "ai";
import { createSprayCheckAgent } from "@/agent/agent";
import { AGENT_TIMEOUT_MS } from "@/agent/model";
import { reconcileSprayCheck, ruleBasedAnswer, type ToolResult } from "@/agent/spray-check/reconcile";
import type { SprayCheckOutcome, SprayCheckTrace } from "@/agent/spray-check/schemas";

const MAX_ATTEMPTS = 2;

export type SprayCheckInput = {
  question: string;
  model?: LanguageModel;
  now?: Date;
  maxRetries?: number;
  telemetryFunctionId?: string;
  abortSignal?: AbortSignal;
  timeoutMs?: number;
};

type Collected = SprayCheckTrace & { toolResults: ToolResult[] };

function emptyCollected(): Collected {
  return { steps: 0, inputTokens: 0, outputTokens: 0, toolCalls: [], toolResults: [] };
}

function traceOf({ steps, inputTokens, outputTokens, toolCalls }: Collected): SprayCheckTrace {
  return { steps, inputTokens, outputTokens, toolCalls };
}

export async function runSprayCheck({
  question,
  model,
  now = new Date(),
  maxRetries,
  telemetryFunctionId = "spray-check",
  abortSignal,
  timeoutMs = AGENT_TIMEOUT_MS,
}: SprayCheckInput): Promise<SprayCheckOutcome> {
  let collected = emptyCollected();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const current = emptyCollected();
    try {
      const agent = createSprayCheckAgent({
        model,
        maxRetries,
        telemetryFunctionId: `${telemetryFunctionId}${attempt > 1 ? `:retry${attempt - 1}` : ""}`,
      });
      const result = await agent.generate({
        prompt: question,
        options: { now },
        abortSignal,
        timeout: timeoutMs,
        onStepEnd: (step) => {
          current.steps += 1;
          current.inputTokens += step.usage.inputTokens ?? 0;
          current.outputTokens += step.usage.outputTokens ?? 0;
          current.toolCalls.push(...step.toolCalls.map(({ toolName, input }) => ({ toolName, input })));
          current.toolResults.push(...step.toolResults.map(({ toolName, output }) => ({ toolName, output })));
        },
      });

      const reconciliation = reconcileSprayCheck(result.output, current.toolResults);
      return reconciliation.ok
        ? { ...reconciliation, reasonSource: "model", trace: traceOf(current) }
        : { ...reconciliation, trace: traceOf(current) };
    } catch (error) {
      if (!NoObjectGeneratedError.isInstance(error)) throw error;
      console.warn(`spray-check: attempt ${attempt} produced no valid object`, error.text?.slice(0, 200) || "(empty)");
      if (current.toolResults.length > 0 || collected.toolResults.length === 0) collected = current;
    }
  }

  const fallback = ruleBasedAnswer(collected.toolResults);
  if (fallback) return { ok: true, result: fallback, overridden: false, reasonSource: "rules", trace: traceOf(collected) };
  return { ok: false, error: "invalid_model_output", trace: traceOf(collected) };
}
