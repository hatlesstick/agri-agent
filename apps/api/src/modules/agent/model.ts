import { gateway, wrapLanguageModel, type LanguageModel } from "ai";
import { labelReminderMiddleware } from "@/guardrails/label-reminder";
import { toolCodeLeakMiddleware } from "@/guardrails/tool-code-leak";
import { serverEnv } from "@agri/shared/server-env";
import { createMockChatModel } from "@/mock/model";
import { MOCK_TOOL_MATCHERS } from "@/mock/tool-matchers";

export const CHAT_MODEL = "google/gemini-2.5-flash-lite";
export const FALLBACK_CHAT_MODEL = "openai/gpt-5.4-nano";
export const EMBEDDING_MODEL = "google/gemini-embedding-001";

export const MAX_OUTPUT_TOKENS = 800;
export const MAX_AGENT_STEPS = 5;
export const AGENT_TIMEOUT_MS = 30_000;

export function isMockMode(): boolean {
  return serverEnv().AI_MOCK;
}

export function chatModel(modelId: string = CHAT_MODEL): LanguageModel {
  const model = isMockMode() ? createMockChatModel({ toolMatchers: MOCK_TOOL_MATCHERS }) : gateway(modelId);
  return wrapLanguageModel({ model, middleware: [toolCodeLeakMiddleware, labelReminderMiddleware] });
}
