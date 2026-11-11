import { createAgentUIStreamResponse } from "ai";
import { AGENT_TIMEOUT_MS, createAgroAgent, SCREEN_REFUSAL, screenInput } from "@/agent";
import { latestUserText, parseChatRequest, readJsonBody } from "@/server/guardrails/chat-request";
import { chatRateLimiter, clientKey, rateLimitedResponse } from "@/server/guardrails/rate-limit";
import { refusalStreamResponse } from "@/server/screened-response";

export async function handleChatRequest(req: Request): Promise<Response> {
  const limit = chatRateLimiter.check(clientKey(req));
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterMs);

  const body = await readJsonBody(req);
  if (!body.ok) {
    return Response.json({ error: body.error }, { status: body.status });
  }

  const request = await parseChatRequest(body.body);
  if (!request.ok) {
    return Response.json({ error: request.error }, { status: request.status });
  }

  const screen = screenInput(latestUserText(request.messages));
  if (screen.verdict === "block") {
    console.warn("guardrail: chat input blocked", { reason: screen.reason });
    return refusalStreamResponse(SCREEN_REFUSAL);
  }

  return createAgentUIStreamResponse({
    agent: createAgroAgent(),
    uiMessages: request.messages,
    options: { now: new Date() },
    abortSignal: req.signal,
    timeout: AGENT_TIMEOUT_MS,
  });
}
