import { streamText } from "ai";
import { describe, expect, it } from "vitest";
import { createMockChatModel } from "@/lib/mock-model";

describe("createMockChatModel", () => {
  it("echoes user text as streamed chunks", async () => {
    const result = streamText({ model: createMockChatModel({ chunkDelayInMs: null }), prompt: "привіт світ" });
    expect(await result.text).toBe("[mock] You said: привіт світ");
  });

  it("streams more than one text delta", async () => {
    const result = streamText({ model: createMockChatModel({ chunkDelayInMs: null }), prompt: "привіт світ" });
    const deltas: string[] = [];
    for await (const delta of result.textStream) deltas.push(delta);
    expect(deltas.length).toBeGreaterThan(1);
  });

  it("finishes with reason stop", async () => {
    const result = streamText({ model: createMockChatModel({ chunkDelayInMs: null }), prompt: "привіт" });
    expect(await result.finishReason).toBe("stop");
  });

  it("uses the last user message when there is history", async () => {
    const result = streamText({
      model: createMockChatModel({ chunkDelayInMs: null }),
      messages: [
        { role: "user", content: "перше" },
        { role: "assistant", content: "відповідь" },
        { role: "user", content: "друге" },
      ],
    });
    expect(await result.text).toBe("[mock] You said: друге");
  });
});
