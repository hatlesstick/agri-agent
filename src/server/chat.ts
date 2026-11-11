import { createAgentUIStreamResponse } from "ai";
import { createAgroAgent } from "@/agent";
import { parseChatRequest, readJsonBody } from "@/server/guardrails/chat-request";

export async function handleChatRequest(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body.ok) {
    return Response.json({ error: body.error }, { status: body.status });
  }

  const request = await parseChatRequest(body.body);
  if (!request.ok) {
    return Response.json({ error: request.error }, { status: request.status });
  }

  return createAgentUIStreamResponse({
    agent: createAgroAgent(),
    uiMessages: request.messages,
    options: { now: new Date() },
  });
}
