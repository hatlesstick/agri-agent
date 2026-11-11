import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { parseChatRequest, readJsonBody } from "@/server/guardrails/chat-request";
import { agentTools, buildInstructions, chatModel, MAX_AGENT_STEPS, MAX_OUTPUT_TOKENS } from "@/agent";

export async function handleChatRequest(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body.ok) {
    return Response.json({ error: body.error }, { status: body.status });
  }

  const request = await parseChatRequest(body.body);
  if (!request.ok) {
    return Response.json({ error: request.error }, { status: request.status });
  }

  const result = streamText({
    model: chatModel(),
    system: buildInstructions(),
    messages: await convertToModelMessages(request.messages),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    tools: agentTools,
    stopWhen: isStepCount(MAX_AGENT_STEPS),
    telemetry: { functionId: "chat" },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
