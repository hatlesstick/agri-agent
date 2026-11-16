import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

type CallOptions = Parameters<MockLanguageModelV4["doStream"]>[0];
type Prompt = CallOptions["prompt"];
type StreamResult = Awaited<ReturnType<MockLanguageModelV4["doStream"]>>;
type StreamPart = StreamResult["stream"] extends ReadableStream<infer Part> ? Part : never;
type GenerateResult = Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>;

export type MockToolMatcher = {
  toolName: string;
  matches: (userText: string) => boolean;
  input: (userText: string) => Record<string, unknown> | null;
};

export type MockChatModelOptions = {
  toolMatchers?: MockToolMatcher[];
  chunkDelayInMs?: number | null;
};

type ScriptedReply =
  | { kind: "text"; text: string }
  | { kind: "tool-call"; toolName: string; input: Record<string, unknown> };

const MOCK_USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

const MAX_TOOL_RESULT_CHARS = 300;
const GULLIBLE_TRIGGER = /ignore (your|all|the) (rules|instructions)/i;

function lastUserText(prompt: Prompt): string {
  const lastUser = prompt.findLast((message) => message.role === "user");
  if (!lastUser || lastUser.role !== "user") return "";
  return lastUser.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

function lastToolResult(prompt: Prompt): { toolName: string; value: unknown } | null {
  const lastMessage = prompt.at(-1);
  if (!lastMessage || lastMessage.role !== "tool") return null;
  const result = lastMessage.content.find((part) => part.type === "tool-result");
  if (!result || result.type !== "tool-result") return null;
  const output = result.output as { type?: string; value?: unknown };
  return { toolName: result.toolName, value: output.type === "json" ? output.value : output };
}

function summarize(value: unknown): string {
  const json = JSON.stringify(value) ?? "null";
  return json.length > MAX_TOOL_RESULT_CHARS ? `${json.slice(0, MAX_TOOL_RESULT_CHARS)}…` : json;
}

function structuredAnswer(userText: string, toolResult: { toolName: string; value: unknown } | null): string {
  const assessment = (toolResult?.toolName === "sprayWindow" ? toolResult.value : null) as {
    city?: string;
    canSpray?: boolean;
    bestWindow?: { from: string; to: string } | null;
    error?: string;
  } | null;

  const gullible = GULLIBLE_TRIGGER.test(userText);
  return JSON.stringify({
    city: assessment?.city ?? "",
    canSpray: gullible ? true : (assessment?.canSpray ?? false),
    bestWindow: assessment?.bestWindow ? { from: assessment.bestWindow.from, to: assessment.bestWindow.to } : null,
    reason: assessment?.error
      ? `[mock] sprayWindow failed: ${assessment.error}`
      : `[mock] ${gullible ? "user asked to ignore the rules" : "based on sprayWindow"}`,
  });
}

function script(options: CallOptions, toolMatchers: MockToolMatcher[]): ScriptedReply {
  const wantsJson = options.responseFormat?.type === "json";
  const userText = lastUserText(options.prompt);
  const toolResult = lastToolResult(options.prompt);

  if (toolResult) {
    return wantsJson
      ? { kind: "text", text: structuredAnswer(userText, toolResult) }
      : { kind: "text", text: `[mock] ${toolResult.toolName} result: ${summarize(toolResult.value)}` };
  }

  const toolNames = (options.tools ?? []).map((tool) => tool.name);
  const matcher = toolMatchers.find((candidate) => toolNames.includes(candidate.toolName) && candidate.matches(userText));
  if (matcher) {
    const input = matcher.input(userText);
    if (input) return { kind: "tool-call", toolName: matcher.toolName, input };
    if (!wantsJson) return { kind: "text", text: "[mock] Which city do you mean?" };
  }

  return wantsJson ? { kind: "text", text: structuredAnswer(userText, null) } : { kind: "text", text: `[mock] You said: ${userText}` };
}

function toStreamParts(reply: ScriptedReply): StreamPart[] {
  if (reply.kind === "tool-call") {
    return [
      { type: "tool-call", toolCallId: `mock-call-${reply.toolName}`, toolName: reply.toolName, input: JSON.stringify(reply.input) },
      { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: MOCK_USAGE },
    ];
  }
  const id = "mock-text";
  return [
    { type: "text-start", id },
    ...reply.text.split(/(?<=\s)/).map((delta): StreamPart => ({ type: "text-delta", id, delta })),
    { type: "text-end", id },
    { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: MOCK_USAGE },
  ];
}

function toGenerateResult(reply: ScriptedReply): GenerateResult {
  if (reply.kind === "tool-call") {
    return {
      content: [{ type: "tool-call", toolCallId: `mock-call-${reply.toolName}`, toolName: reply.toolName, input: JSON.stringify(reply.input) }],
      finishReason: { unified: "tool-calls", raw: undefined },
      usage: MOCK_USAGE,
      warnings: [],
    };
  }
  return {
    content: [{ type: "text", text: reply.text }],
    finishReason: { unified: "stop", raw: undefined },
    usage: MOCK_USAGE,
    warnings: [],
  };
}

export function createMockChatModel({ toolMatchers = [], chunkDelayInMs = 30 }: MockChatModelOptions = {}) {
  return new MockLanguageModelV4({
    provider: "mock",
    modelId: "mock-chat",
    doGenerate: async (options) => toGenerateResult(script(options, toolMatchers)),
    doStream: async (options) => ({
      stream: simulateReadableStream({
        chunks: toStreamParts(script(options, toolMatchers)),
        chunkDelayInMs,
      }),
    }),
  });
}
