import { describe, expect, it } from "vitest";
import type { UIMessageChunk } from "ai";
import { EMPTY_ANSWER_FALLBACK, withEmptyAnswerFallback } from "@/modules/chat/streams/empty-answer-fallback";

function streamOf(chunks: UIMessageChunk[]): ReadableStream<UIMessageChunk> {
  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<UIMessageChunk>): Promise<UIMessageChunk[]> {
  const out: UIMessageChunk[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out.push(value);
  }
}

const tool: UIMessageChunk[] = [
  { type: "start" },
  { type: "start-step" },
  { type: "tool-input-available", toolCallId: "1", toolName: "searchDocs", input: { query: "x" } },
  { type: "tool-output-available", toolCallId: "1", output: { hits: [] } },
  { type: "finish-step" },
];

describe("withEmptyAnswerFallback", () => {
  it("passes the stream through unchanged when the answer has text", async () => {
    const chunks: UIMessageChunk[] = [
      ...tool,
      { type: "start-step" },
      { type: "text-start", id: "t" },
      { type: "text-delta", id: "t", delta: "Answer." },
      { type: "text-end", id: "t" },
      { type: "finish" },
    ];
    expect(await collect(withEmptyAnswerFallback(streamOf(chunks), EMPTY_ANSWER_FALLBACK))).toEqual(chunks);
  });

  it("adds the fallback text before finish when the model ended after a tool with no text", async () => {
    const out = await collect(withEmptyAnswerFallback(streamOf([...tool, { type: "finish" }]), EMPTY_ANSWER_FALLBACK));
    const types = out.map((chunk) => chunk.type);
    expect(types.slice(-4)).toEqual(["text-start", "text-delta", "text-end", "finish"]);
    expect(out.find((chunk) => chunk.type === "text-delta")).toMatchObject({ delta: EMPTY_ANSWER_FALLBACK });
  });

  it("adds the fallback text when there was no text and no tool either", async () => {
    const out = await collect(withEmptyAnswerFallback(streamOf([{ type: "start" }, { type: "finish" }]), EMPTY_ANSWER_FALLBACK));
    expect(out.map((chunk) => chunk.type)).toEqual(["start", "text-start", "text-delta", "text-end", "finish"]);
  });

  it("adds the fallback when the only text deltas are empty strings", async () => {
    const out = await collect(
      withEmptyAnswerFallback(
        streamOf([...tool, { type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "" }, { type: "text-end", id: "t" }, { type: "finish" }]),
        EMPTY_ANSWER_FALLBACK,
      ),
    );
    expect(out.find((chunk) => chunk.type === "text-delta" && chunk.id === "empty-answer-fallback")).toMatchObject({ delta: EMPTY_ANSWER_FALLBACK });
  });

  it("does not add a fallback when the stream ends without a finish chunk", async () => {
    const out = await collect(withEmptyAnswerFallback(streamOf([...tool]), EMPTY_ANSWER_FALLBACK));
    expect(out.some((chunk) => chunk.type === "text-delta")).toBe(false);
  });
});
