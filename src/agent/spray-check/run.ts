import { generateText, isStepCount, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import { buildInstructions } from "@/agent/instructions";
import { chatModel, MAX_AGENT_STEPS, MAX_OUTPUT_TOKENS } from "@/agent/model";
import { reconcileSprayCheck, ruleBasedAnswer, type ToolResult } from "@/agent/spray-check/reconcile";
import { sprayCheckSchema, type SprayCheckOutcome, type SprayCheckTrace } from "@/agent/spray-check/schemas";
import { agentTools, agentToolsContext } from "@/agent/tools";

const STRUCTURED_OUTPUT_INSTRUCTIONS = [
  "This request comes from an API that needs a structured answer.",
  "If the question is about spraying and names a city, call sprayWindow first, then copy city, canSpray and bestWindow from its result.",
  "If the question is not about spraying or names no city, do not call any tool: answer with city \"\", canSpray false, bestWindow null and explain why in reason.",
  "If sprayWindow returns an error, set canSpray to false, bestWindow to null and explain the error in reason.",
].join("\n");

const MAX_ATTEMPTS = 2;

export type SprayCheckInput = {
  question: string;
  model?: LanguageModel;
  now?: Date;
  maxRetries?: number;
  telemetryFunctionId?: string;
};

type Collected = SprayCheckTrace & { toolResults: ToolResult[] };

function emptyCollected(): Collected {
  return { steps: 0, toolCalls: [], toolResults: [] };
}

function traceOf({ steps, toolCalls }: Collected): SprayCheckTrace {
  return { steps, toolCalls };
}

export async function runSprayCheck({
  question,
  model = chatModel(),
  now = new Date(),
  maxRetries,
  telemetryFunctionId = "spray-check",
}: SprayCheckInput): Promise<SprayCheckOutcome> {
  let collected = emptyCollected();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const current = emptyCollected();
    try {
      const result = await generateText({
        model,
        system: `${buildInstructions(now)}\n\n${STRUCTURED_OUTPUT_INSTRUCTIONS}`,
        prompt: question,
        tools: agentTools,
        toolsContext: agentToolsContext(now),
        output: Output.object({ schema: sprayCheckSchema }),
        stopWhen: isStepCount(MAX_AGENT_STEPS),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        maxRetries,
        telemetry: { functionId: `${telemetryFunctionId}${attempt > 1 ? `:retry${attempt - 1}` : ""}` },
        onStepEnd: (step) => {
          current.steps += 1;
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
