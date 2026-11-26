import { describe, expect, it } from "vitest";
import type { UIMessageChunk } from "ai";
import { stripLeadingToolOutput, withToolOutputGuard } from "@/modules/chat/streams/tool-output-guard";

const LEAK = "{'sprayWindow_response': {'content': {'canSpray': False, 'rejectedReasons': {'too_cold': 8}}, 'name': 'sprayWindow'}}";

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

function textOf(chunks: UIMessageChunk[]): string {
  return chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => (chunk.type === "text-delta" ? chunk.delta : "")).join("");
}

describe("stripLeadingToolOutput", () => {
  it("removes a leading tool object and keeps the answer", () => {
    expect(stripLeadingToolOutput(`${LEAK}\nЛодзь сьогодні: ні.`)).toBe("Лодзь сьогодні: ні.");
  });

  it("leaves a normal answer unchanged", () => {
    expect(stripLeadingToolOutput("Легкий бриз ідеальний.")).toBe("Легкий бриз ідеальний.");
  });

  it("does not touch braces that are not a tool output", () => {
    expect(stripLeadingToolOutput("{x} означає змінну.")).toBe("{x} означає змінну.");
  });

  it("returns an empty string when the answer is only the tool object", () => {
    expect(stripLeadingToolOutput(LEAK)).toBe("");
  });
});

describe("withToolOutputGuard", () => {
  it("strips the leaked object when it arrives in several deltas", async () => {
    const parts = [LEAK.slice(0, 30), LEAK.slice(30, 120), LEAK.slice(120), "\nЛодзь: ні."];
    const chunks: UIMessageChunk[] = [
      { type: "text-start", id: "t" },
      ...parts.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
      { type: "text-end", id: "t" },
    ];
    const out = await collect(withToolOutputGuard(streamOf(chunks)));
    expect(textOf(out)).toBe("Лодзь: ні.");
  });

  it("passes a normal answer through with the same text", async () => {
    const chunks: UIMessageChunk[] = [
      { type: "text-start", id: "t" },
      { type: "text-delta", id: "t", delta: "Відповідь " },
      { type: "text-delta", id: "t", delta: "без змін." },
      { type: "text-end", id: "t" },
    ];
    expect(textOf(await collect(withToolOutputGuard(streamOf(chunks))))).toBe("Відповідь без змін.");
  });

  it("emits nothing for an answer that is only the leaked object", async () => {
    const chunks: UIMessageChunk[] = [
      { type: "text-start", id: "t" },
      { type: "text-delta", id: "t", delta: LEAK },
      { type: "text-end", id: "t" },
    ];
    expect(textOf(await collect(withToolOutputGuard(streamOf(chunks))))).toBe("");
  });
});
