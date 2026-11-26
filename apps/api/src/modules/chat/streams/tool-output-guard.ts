import type { UIMessageChunk } from "ai";

const TOOL_OUTPUT_START = /^\s*\{\s*['"]\w+_response['"]\s*:/;
const UNDECIDED_MAX_CHARS = 40;

type Lead = { kind: "none" } | { kind: "pending" } | { kind: "object"; end: number };

function objectEnd(text: string, open: number): number | null {
  let depth = 0;
  let quote: string | null = null;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return null;
}

function leadOf(text: string): Lead {
  const trimmed = text.trimStart();
  if (trimmed === "") return { kind: "pending" };
  if (!trimmed.startsWith("{")) return { kind: "none" };
  if (TOOL_OUTPUT_START.test(text)) {
    const end = objectEnd(text, text.indexOf("{"));
    return end === null ? { kind: "pending" } : { kind: "object", end };
  }
  return trimmed.length < UNDECIDED_MAX_CHARS ? { kind: "pending" } : { kind: "none" };
}

export function stripLeadingToolOutput(text: string): string {
  const lead = leadOf(text);
  return lead.kind === "object" ? text.slice(lead.end).replace(/^\s+/, "") : text;
}

export function withToolOutputGuard(stream: ReadableStream<UIMessageChunk>): ReadableStream<UIMessageChunk> {
  let buffer: string | null = null;
  let skippingWhitespace = false;
  let id = "";
  return stream.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        if (chunk.type === "text-start") {
          buffer = "";
          id = chunk.id;
          controller.enqueue(chunk);
          return;
        }
        if (chunk.type === "text-delta" && buffer !== null) {
          buffer += chunk.delta;
          const lead = leadOf(buffer);
          if (lead.kind === "pending") return;
          const rest = lead.kind === "object" ? buffer.slice(lead.end) : buffer;
          buffer = null;
          skippingWhitespace = lead.kind === "object";
          const delta = skippingWhitespace ? rest.replace(/^\s+/, "") : rest;
          skippingWhitespace = skippingWhitespace && delta.length === 0;
          if (delta.length > 0) controller.enqueue({ type: "text-delta", id, delta });
          return;
        }
        if (chunk.type === "text-delta" && skippingWhitespace) {
          const delta = chunk.delta.replace(/^\s+/, "");
          skippingWhitespace = delta.length === 0;
          if (delta.length > 0) controller.enqueue({ ...chunk, delta });
          return;
        }
        if (chunk.type === "text-end" && buffer !== null) {
          if (buffer.length > 0) controller.enqueue({ type: "text-delta", id, delta: buffer });
          buffer = null;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}
