import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { parseChatRequest, readJsonBody } from "@/guardrails/chat-request";
import { BASE_INSTRUCTIONS } from "@/agent/instructions";
import { chatModel, MAX_AGENT_STEPS, MAX_OUTPUT_TOKENS } from "@/ai/model";
import { agentTools } from "@/agent/tools";

export async function POST(req: Request) {
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
    system: BASE_INSTRUCTIONS,
    messages: await convertToModelMessages(request.messages),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    tools: agentTools,
    stopWhen: isStepCount(MAX_AGENT_STEPS),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
