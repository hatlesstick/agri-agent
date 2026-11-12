const MESSAGES: Record<string, string> = {
  rate_limited: "Too many requests. Please wait a minute and try again.",
  message_too_long: "Your message is too long. Please shorten it.",
  conversation_too_long: "The conversation is too long. Please start a new chat.",
  payload_too_large: "The conversation is too long. Please start a new chat.",
  part_too_large: "The conversation is too long. Please start a new chat.",
  invalid_request: "The request could not be processed. Please reload the page.",
};

const FALLBACK = "Something went wrong. Please try again.";

export function friendlyChatError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return FALLBACK;
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    const code = parsed && typeof parsed === "object" && "error" in parsed ? String(parsed.error) : "";
    return MESSAGES[code] ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}
