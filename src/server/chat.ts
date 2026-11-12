import { after } from "next/server";
import { createAgentUIStreamResponse } from "ai";
import { AGENT_TIMEOUT_MS, createAgriAgent, flushAgentTelemetry, isTelemetryEnabled, SCREEN_REFUSAL, screenInput } from "@/agent";
import { dropBlockedHistory, latestUserText, parseChatRequest, readJsonBody } from "@/server/guardrails/chat-request";
import { checkRateLimit, rateLimitedResponse } from "@/server/guardrails/rate-limit";
import { chatErrorMessage } from "@/server/chat-errors";
import { refusalStreamResponse } from "@/server/screened-response";

export async function handleChatRequest(req: Request): Promise<Response> {
  const limit = checkRateLimit(req, "chat");
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

  if (isTelemetryEnabled()) after(() => flushAgentTelemetry());

  return createAgentUIStreamResponse({
    agent: createAgriAgent(),
    uiMessages: dropBlockedHistory(request.messages, (text) => screenInput(text).verdict === "block"),
    options: { now: new Date() },
    abortSignal: req.signal,
    timeout: AGENT_TIMEOUT_MS,
    onError: chatErrorMessage,
  });
}
