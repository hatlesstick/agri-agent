import { after } from "next/server";
import { flushAgentTelemetry, isTelemetryEnabled } from "@/agent";
import { parseChatRequest, readJsonBody } from "@/server/guardrails/chat-request";
import { checkRateLimit, rateLimitedResponse } from "@/server/guardrails/rate-limit";
import { jsonError } from "@/server/helpers/http-responses";
import { chatService, type ChatService } from "@/server/services/chat/ChatService";

export class ChatController {
  constructor(private readonly chat: ChatService) {}

  handle = async (req: Request): Promise<Response> => {
    const limit = checkRateLimit(req, "chat");
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterMs);

    const body = await readJsonBody(req);
    if (!body.ok) return jsonError(body.error, body.status);

    const request = await parseChatRequest(body.body);
    if (!request.ok) return jsonError(request.error, request.status);

    if (isTelemetryEnabled()) after(() => flushAgentTelemetry());

    return this.chat.streamReply({ messages: request.messages, abortSignal: req.signal });
  };
}

export const chatController = new ChatController(chatService);
