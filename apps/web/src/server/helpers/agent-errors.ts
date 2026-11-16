import { jsonError } from "@/server/helpers/http-responses";

export type AgentErrorKind = "rate_limited" | "timed_out" | "internal";

const RATE_LIMITED = /RateLimit|Rate limit|429/i;
const TIMED_OUT = /AbortError|TimeoutError|timed out|Delay was aborted/i;

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name} ${error.message}` : String(error);
}

export function classifyAgentError(error: unknown): AgentErrorKind {
  const text = describeError(error);
  if (RATE_LIMITED.test(text)) return "rate_limited";
  if (TIMED_OUT.test(text)) return "timed_out";
  return "internal";
}

function logAgentError(channel: string, error: unknown): AgentErrorKind {
  console.error(`${channel}: agent error`, describeError(error).slice(0, 300));
  return classifyAgentError(error);
}

const CHAT_MESSAGES: Record<AgentErrorKind, string> = {
  rate_limited: "The AI service is busy right now (rate limit). Please try again in a minute.",
  timed_out: "The answer took too long. Please try again.",
  internal: "Something went wrong. Please try again.",
};

export function chatErrorMessage(error: unknown): string {
  return CHAT_MESSAGES[logAgentError("chat", error)];
}

export function agentFailureResponse(error: unknown, channel: string): Response {
  const kind = logAgentError(channel, error);
  if (kind === "rate_limited") return jsonError("model_busy", 503, { "Retry-After": "60" });
  if (kind === "timed_out") return jsonError("model_timeout", 504);
  return jsonError("internal_error", 500);
}
