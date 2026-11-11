import { safeValidateUIMessages, type UIMessage } from "ai";
import { z } from "zod";

export const CHAT_LIMITS = {
  maxMessages: 20,
  maxMessageChars: 2000,
  maxTotalChars: 8000,
  keepLastMessages: 12,
} as const;

const chatMessageSchema = z.looseObject({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.looseObject({ type: z.string() })).min(1),
});

export const chatRequestSchema = z.looseObject({
  messages: z.array(chatMessageSchema).min(1).max(CHAT_LIMITS.maxMessages),
});

export type ChatRequestError = "invalid_request" | "message_too_long" | "conversation_too_long";

export type ChatRequestResult =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; status: 400 | 413; error: ChatRequestError };

function textLength(message: UIMessage): number {
  return message.parts.reduce((total, part) => total + (part.type === "text" ? part.text.length : 0), 0);
}

export async function parseChatRequest(body: unknown): Promise<ChatRequestResult> {
  const shape = chatRequestSchema.safeParse(body);
  if (!shape.success) return { ok: false, status: 400, error: "invalid_request" };

  const validated = await safeValidateUIMessages({ messages: shape.data.messages });
  if (!validated.success) return { ok: false, status: 400, error: "invalid_request" };

  const messages = validated.data;
  const lengths = messages.map(textLength);
  if (lengths.some((length) => length > CHAT_LIMITS.maxMessageChars)) {
    return { ok: false, status: 413, error: "message_too_long" };
  }
  if (lengths.reduce((total, length) => total + length, 0) > CHAT_LIMITS.maxTotalChars) {
    return { ok: false, status: 413, error: "conversation_too_long" };
  }

  return { ok: true, messages: messages.slice(-CHAT_LIMITS.keepLastMessages) };
}
