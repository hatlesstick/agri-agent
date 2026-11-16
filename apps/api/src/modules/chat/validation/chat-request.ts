import { safeValidateUIMessages, type UIMessage } from "ai";
import { CHAT_LIMITS } from "@agri/shared";
import { chatRequestSchema, type ErrorCode } from "@agri/shared/contracts";

export type ChatRequestError = Extract<ErrorCode, "invalid_request" | "part_too_large" | "message_too_long" | "conversation_too_long">;

export type ChatRequestResult =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; status: 400 | 413; error: ChatRequestError };

export function withoutClientToolData(messages: UIMessage[]): UIMessage[] {
  return messages
    .map((message) =>
      message.role === "assistant" ? { ...message, parts: message.parts.filter((part) => part.type === "text") } : message,
    )
    .filter((message) => message.parts.length > 0);
}

function messageText(message: UIMessage): string {
  return message.parts.map((part) => (part.type === "text" ? part.text : "")).join("\n");
}

export function dropBlockedHistory(messages: UIMessage[], isBlocked: (text: string) => boolean): UIMessage[] {
  const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
  return messages.filter((message, index) => index === latestUserIndex || !isBlocked(messageText(message)));
}

export function latestUserText(messages: UIMessage[]): string {
  const latest = messages.findLast((message) => message.role === "user");
  return latest?.parts.map((part) => (part.type === "text" ? part.text : "")).join("\n") ?? "";
}

function textLength(message: UIMessage): number {
  return message.parts.reduce((total, part) => total + (part.type === "text" ? part.text.length : 0), 0);
}

export async function parseChatRequest(body: unknown): Promise<ChatRequestResult> {
  const shape = chatRequestSchema.safeParse(body);
  if (!shape.success) return { ok: false, status: 400, error: "invalid_request" };

  const validated = await safeValidateUIMessages({ messages: shape.data.messages });
  if (!validated.success) return { ok: false, status: 400, error: "invalid_request" };

  const messages = validated.data;
  const hasOversizedPart = messages.some((message) =>
    message.parts.some((part) => part.type !== "text" && JSON.stringify(part).length > CHAT_LIMITS.maxPartChars),
  );
  if (hasOversizedPart) return { ok: false, status: 413, error: "part_too_large" };

  const lengths = messages.map(textLength);
  if (lengths.some((length) => length > CHAT_LIMITS.maxMessageChars)) {
    return { ok: false, status: 413, error: "message_too_long" };
  }
  if (lengths.reduce((total, length) => total + length, 0) > CHAT_LIMITS.maxTotalChars) {
    return { ok: false, status: 413, error: "conversation_too_long" };
  }

  return { ok: true, messages: withoutClientToolData(messages.slice(-CHAT_LIMITS.keepLastMessages)) };
}
