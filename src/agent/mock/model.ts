import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

type DoStreamOptions = Parameters<MockLanguageModelV4["doStream"]>[0];
type Prompt = DoStreamOptions["prompt"];
type StreamResult = Awaited<ReturnType<MockLanguageModelV4["doStream"]>>;
type StreamPart = StreamResult["stream"] extends ReadableStream<infer Part> ? Part : never;

export type MockToolMatcher = {
  toolName: string;
  matches: (userText: string) => boolean;
  input: (userText: string) => Record<string, unknown> | null;
};

export type MockChatModelOptions = {
  toolMatchers?: MockToolMatcher[];
  chunkDelayInMs?: number | null;
};

const MOCK_USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

const MAX_TOOL_RESULT_CHARS = 300;

function lastUserText(prompt: Prompt): string {
  const lastUser = prompt.findLast((message) => message.role === "user");
  if (!lastUser || lastUser.role !== "user") return "";
  return lastUser.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

function lastToolResult(prompt: Prompt): { toolName: string; output: unknown } | null {
  const lastMessage = prompt.at(-1);
  if (!lastMessage || lastMessage.role !== "tool") return null;
  const result = lastMessage.content.find((part) => part.type === "tool-result");
  if (!result || result.type !== "tool-result") return null;
  return { toolName: result.toolName, output: result.output };
}

function availableToolNames(options: DoStreamOptions): string[] {
  return (options.tools ?? []).map((tool) => tool.name);
}

function textParts(text: string): StreamPart[] {
  const id = "mock-text";
  const deltas = text.split(/(?<=\s)/);
  return [
    { type: "text-start", id },
    ...deltas.map((delta): StreamPart => ({ type: "text-delta", id, delta })),
    { type: "text-end", id },
    { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: MOCK_USAGE },
  ];
}

function toolCallParts(toolName: string, input: Record<string, unknown>): StreamPart[] {
  return [
    { type: "tool-call", toolCallId: `mock-call-${toolName}`, toolName, input: JSON.stringify(input) },
    { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: MOCK_USAGE },
  ];
}

function summarize(value: unknown): string {
  const json = JSON.stringify(value) ?? "null";
  return json.length > MAX_TOOL_RESULT_CHARS ? `${json.slice(0, MAX_TOOL_RESULT_CHARS)}…` : json;
}

function scriptResponse(options: DoStreamOptions, toolMatchers: MockToolMatcher[]): StreamPart[] {
  const toolResult = lastToolResult(options.prompt);
  if (toolResult) {
    return textParts(`[mock] ${toolResult.toolName} result: ${summarize(toolResult.output)}`);
  }

  const userText = lastUserText(options.prompt);
  const toolNames = availableToolNames(options);
  const matcher = toolMatchers.find(
    (candidate) => toolNames.includes(candidate.toolName) && candidate.matches(userText),
  );
  if (matcher) {
    const input = matcher.input(userText);
    return input ? toolCallParts(matcher.toolName, input) : textParts("[mock] Which city do you mean?");
  }

  return textParts(`[mock] You said: ${userText}`);
}

export function createMockChatModel({ toolMatchers = [], chunkDelayInMs = 30 }: MockChatModelOptions = {}) {
  return new MockLanguageModelV4({
    provider: "mock",
    modelId: "mock-chat",
    doStream: async (options) => ({
      stream: simulateReadableStream({
        chunks: scriptResponse(options, toolMatchers),
        chunkDelayInMs,
      }),
    }),
  });
}
