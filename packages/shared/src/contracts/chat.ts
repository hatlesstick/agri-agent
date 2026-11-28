import { z } from "zod";
import { CHAT_LIMITS } from "@/chat-limits";

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

export const chatMessageSchema = z.discriminatedUnion("role", [userMessageSchema, assistantMessageSchema]);

export const chatRequestSchema = z.looseObject({
  messages: z.array(chatMessageSchema).min(1).max(CHAT_LIMITS.maxMessages),
  conversationId: z.uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
