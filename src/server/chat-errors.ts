const RATE_LIMITED = /RateLimit|Rate limit|429/i;
const TIMED_OUT = /AbortError|TimeoutError|timed out|Delay was aborted/i;

export function chatErrorMessage(error: unknown): string {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  console.error("chat: agent error", text.slice(0, 300));
  if (RATE_LIMITED.test(text)) return "The AI service is busy right now (rate limit). Please try again in a minute.";
  if (TIMED_OUT.test(text)) return "The answer took too long. Please try again.";
  return "Something went wrong. Please try again.";
}
