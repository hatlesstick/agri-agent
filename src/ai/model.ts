import type { LanguageModel } from "ai";
import { serverEnv } from "@/config/env";
import { createMockChatModel } from "@/ai/mock/model";
import { MOCK_TOOL_MATCHERS } from "@/ai/mock/tool-matchers";

export const CHAT_MODEL = "google/gemini-2.5-flash-lite";
export const FALLBACK_CHAT_MODEL = "openai/gpt-5.4-nano";
export const EMBEDDING_MODEL = "google/gemini-embedding-001";

export const MAX_OUTPUT_TOKENS = 800;
export const MAX_AGENT_STEPS = 3;

export function isMockMode(): boolean {
  return serverEnv().AI_MOCK;
}

export function chatModel(): LanguageModel {
  return isMockMode() ? createMockChatModel({ toolMatchers: MOCK_TOOL_MATCHERS }) : CHAT_MODEL;
}
