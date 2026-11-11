import { isStepCount, Output, ToolLoopAgent, type InferAgentUIMessage, type LanguageModel } from "ai";
import { z } from "zod";
import { buildInstructions, STRUCTURED_OUTPUT_INSTRUCTIONS } from "@/agent/instructions";
import { chatModel, MAX_AGENT_STEPS, MAX_OUTPUT_TOKENS } from "@/agent/model";
import { sprayCheckSchema } from "@/agent/spray-check/schemas";
import { agentTools, agentToolsContext } from "@/agent/tools";

export const agentCallOptionsSchema = z.object({
  now: z.date(),
});

export type AgentCallOptions = z.infer<typeof agentCallOptionsSchema>;

export type AgentFactoryOptions = {
  model?: LanguageModel;
  maxRetries?: number;
  telemetryFunctionId?: string;
};

export function createAgroAgent({ model = chatModel(), maxRetries, telemetryFunctionId = "chat" }: AgentFactoryOptions = {}) {
  return new ToolLoopAgent({
    model,
    tools: agentTools,
    toolsContext: agentToolsContext(),
    callOptionsSchema: agentCallOptionsSchema,
    prepareCall: ({ options, ...settings }) => ({
      ...settings,
      instructions: buildInstructions(options.now),
      toolsContext: agentToolsContext(options.now),
    }),
    stopWhen: isStepCount(MAX_AGENT_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries,
    telemetry: { functionId: telemetryFunctionId },
  });
}

export function createSprayCheckAgent({
  model = chatModel(),
  maxRetries,
  telemetryFunctionId = "spray-check",
}: AgentFactoryOptions = {}) {
  return new ToolLoopAgent({
    model,
    tools: agentTools,
    toolsContext: agentToolsContext(),
    callOptionsSchema: agentCallOptionsSchema,
    prepareCall: ({ options, ...settings }) => ({
      ...settings,
      instructions: `${buildInstructions(options.now)}\n\n${STRUCTURED_OUTPUT_INSTRUCTIONS}`,
      toolsContext: agentToolsContext(options.now),
    }),
    activeTools: ["getWeather", "sprayWindow"],
    output: Output.object({ schema: sprayCheckSchema }),
    stopWhen: isStepCount(MAX_AGENT_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries,
    telemetry: { functionId: telemetryFunctionId },
  });
}

export type AgroAgent = ReturnType<typeof createAgroAgent>;
export type AgroAgentUIMessage = InferAgentUIMessage<AgroAgent>;
