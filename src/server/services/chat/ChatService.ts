import { createAgentUIStreamResponse } from "ai";
import { AGENT_TIMEOUT_MS, createAgriAgent, SCREEN_REFUSAL, screenInput } from "@/agent";
import { dropBlockedHistory, latestUserText } from "@/server/guardrails/chat-request";
import { chatErrorMessage } from "@/server/helpers/agent-errors";
import { refusalStreamResponse } from "@/server/helpers/refusal-stream";
import type { ChatReplyInput } from "@/server/services/chat/ChatService.types";

const isBlocked = (text: string) => screenInput(text).verdict === "block";

export class ChatService {
  async streamReply({ messages, abortSignal, now = new Date() }: ChatReplyInput): Promise<Response> {
    const screen = screenInput(latestUserText(messages));
    if (screen.verdict === "block") {
      console.warn("guardrail: chat input blocked", { reason: screen.reason });
      return refusalStreamResponse(SCREEN_REFUSAL);
    }

    return createAgentUIStreamResponse({
      agent: createAgriAgent(),
      uiMessages: dropBlockedHistory(messages, isBlocked),
      options: { now },
      abortSignal,
      timeout: AGENT_TIMEOUT_MS,
      onError: chatErrorMessage,
    });
  }
}

export const chatService = new ChatService();
