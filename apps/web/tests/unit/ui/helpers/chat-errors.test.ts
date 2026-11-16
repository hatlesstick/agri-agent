import { describe, expect, it } from "vitest";
import { friendlyChatError } from "@/ui/helpers/chat-errors";

describe("friendlyChatError", () => {
  const problem = (code: string, status = 400) => JSON.stringify({ type: "about:blank", title: "Error", status, instance: "req-1", code });

  it.each([
    [problem("rate_limited", 429), "Too many requests. Please wait a minute and try again."],
    [problem("message_too_long", 413), "Your message is too long. Please shorten it."],
    [problem("conversation_too_long", 413), "The conversation is too long. Please start a new chat."],
    [problem("payload_too_large", 413), "The conversation is too long. Please start a new chat."],
    [problem("invalid_request"), "The request could not be processed. Please reload the page."],
    ["The AI service is busy right now (rate limit). Please try again in a minute.", "The AI service is busy right now (rate limit). Please try again in a minute."],
    [problem("something_new"), "Something went wrong. Please try again."],
    ['{"error":"rate_limited"}', "Something went wrong. Please try again."],
    ["", "Something went wrong. Please try again."],
  ])("%s", (message, expected) => {
    expect(friendlyChatError(message)).toBe(expected);
  });
});
