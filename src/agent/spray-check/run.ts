import { generateText, isStepCount, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import { buildInstructions } from "@/agent/instructions";
import { chatModel, MAX_AGENT_STEPS, MAX_OUTPUT_TOKENS } from "@/agent/model";
import { reconcileSprayCheck } from "@/agent/spray-check/reconcile";
import { sprayCheckSchema, type SprayCheckOutcome, type SprayCheckTrace } from "@/agent/spray-check/schemas";
import { agentTools, agentToolsContext } from "@/agent/tools";

const STRUCTURED_OUTPUT_INSTRUCTIONS = [
  "This request comes from an API that needs a structured answer.",
  "Always call sprayWindow before answering. Copy city, canSpray and bestWindow from its result.",
  "If sprayWindow returns an error, set canSpray to false, bestWindow to null and explain the error in reason.",
].join("\n");

export type SprayCheckInput = {
  question: string;
  model?: LanguageModel;
  now?: Date;
  maxRetries?: number;
  telemetryFunctionId?: string;
};

export async function runSprayCheck({
  question,
  model = chatModel(),
  now = new Date(),
  maxRetries,
  telemetryFunctionId = "spray-check",
}: SprayCheckInput): Promise<SprayCheckOutcome> {
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
      telemetry: { functionId: telemetryFunctionId },
    });

    const trace: SprayCheckTrace = {
      steps: result.steps.length,
      toolCalls: result.steps.flatMap((step) => step.toolCalls.map(({ toolName, input }) => ({ toolName, input }))),
    };
    const toolResults = result.steps.flatMap((step) => step.toolResults.map(({ toolName, output }) => ({ toolName, output })));
    const reconciliation = reconcileSprayCheck(result.output, toolResults);
    return reconciliation.ok ? { ...reconciliation, trace } : { ...reconciliation, trace };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.warn("spray-check: model output did not match the schema", error.text?.slice(0, 300));
      return { ok: false, error: "invalid_model_output", trace: { steps: 0, toolCalls: [] } };
    }
    throw error;
  }
}
