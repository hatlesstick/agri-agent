import { describe, expect, it } from "vitest";
import { friendlyChatError } from "@/ui/helpers/chat-errors";

describe("friendlyChatError", () => {
  it.each([
    ['{"error":"rate_limited"}', "Too many requests. Please wait a minute and try again."],
    ['{"error":"message_too_long"}', "Your message is too long. Please shorten it."],
    ['{"error":"conversation_too_long"}', "The conversation is too long. Please start a new chat."],
    ['{"error":"payload_too_large"}', "The conversation is too long. Please start a new chat."],
    ['{"error":"invalid_request"}', "The request could not be processed. Please reload the page."],
    ["The AI service is busy right now (rate limit). Please try again in a minute.", "The AI service is busy right now (rate limit). Please try again in a minute."],
    ['{"error":"something_new"}', "Something went wrong. Please try again."],
    ["", "Something went wrong. Please try again."],
  ])("%s", (message, expected) => {
    expect(friendlyChatError(message)).toBe(expected);
  });
});
