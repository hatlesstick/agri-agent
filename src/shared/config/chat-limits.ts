export const CHAT_LIMITS = {
  maxMessages: 20,
  maxMessageChars: 2000,
  maxTotalChars: 8000,
  keepLastMessages: 12,
  maxBodyBytes: 256 * 1024,
  maxPartChars: 20_000,
} as const;
