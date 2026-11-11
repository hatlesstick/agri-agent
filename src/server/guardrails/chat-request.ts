import { safeValidateUIMessages, type UIMessage } from "ai";
import { z } from "zod";

export const CHAT_LIMITS = {
  maxMessages: 20,
  maxMessageChars: 2000,
  maxTotalChars: 8000,
  keepLastMessages: 12,
  maxBodyBytes: 256 * 1024,
  maxPartChars: 20_000,
} as const;

const userMessageSchema = z.looseObject({
  id: z.string().min(1),
  role: z.literal("user"),
  parts: z.array(z.looseObject({ type: z.literal("text") })).min(1),
});

const ASSISTANT_PART_TYPE = /^(text|step-start|reasoning|tool-[A-Za-z][A-Za-z0-9]*)$/;

const assistantMessageSchema = z.looseObject({
  id: z.string().min(1),
  role: z.literal("assistant"),
  parts: z.array(z.looseObject({ type: z.string().regex(ASSISTANT_PART_TYPE) })).min(1),
});

const chatMessageSchema = z.discriminatedUnion("role", [userMessageSchema, assistantMessageSchema]);

export const chatRequestSchema = z.looseObject({
  messages: z.array(chatMessageSchema).min(1).max(CHAT_LIMITS.maxMessages),
});

export type ChatRequestError = "invalid_request" | "payload_too_large" | "part_too_large" | "message_too_long" | "conversation_too_long";

export type ChatRequestResult =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; status: 400 | 413; error: ChatRequestError };

export type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; status: 400 | 413; error: ChatRequestError };

async function readLimitedText(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<string | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  const declaredHeader = request.headers.get("content-length");
  if (declaredHeader !== null) {
    const declaredLength = Number(declaredHeader);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      return { ok: false, status: 400, error: "invalid_request" };
    }
    if (declaredLength > CHAT_LIMITS.maxBodyBytes) {
      return { ok: false, status: 413, error: "payload_too_large" };
    }
  }

  if (!request.body) return { ok: false, status: 400, error: "invalid_request" };

  const raw = await readLimitedText(request.body, CHAT_LIMITS.maxBodyBytes);
  if (raw === null) return { ok: false, status: 413, error: "payload_too_large" };

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400, error: "invalid_request" };
  }
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

  return { ok: true, messages: messages.slice(-CHAT_LIMITS.keepLastMessages) };
}
