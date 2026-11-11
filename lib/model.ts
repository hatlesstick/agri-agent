import type { LanguageModel } from "ai";
import { createMockChatModel } from "@/lib/mock-model";

export const CHAT_MODEL = "google/gemini-2.5-flash-lite";
export const FALLBACK_CHAT_MODEL = "openai/gpt-5.4-nano";
export const EMBEDDING_MODEL = "google/gemini-embedding-001";

export const MAX_OUTPUT_TOKENS = 800;

export function isMockMode(): boolean {
  return process.env.AI_MOCK === "1";
}

export function chatModel(): LanguageModel {
  return isMockMode() ? createMockChatModel() : CHAT_MODEL;
}
