import type { AgriAgentUIMessage } from "@/agent";

export type MessagePart = AgriAgentUIMessage["parts"][number];
export type ToolPart = Extract<MessagePart, { type: `tool-${string}` }>;
export type ToolOutput<Name extends string> = Extract<ToolPart, { type: `tool-${Name}` }>["output"];

export const TOOL_STATE_LABEL: Record<ToolPart["state"], string> = {
  "input-streaming": "preparing…",
  "input-available": "running…",
  "output-available": "done",
  "output-error": "failed",
  "output-denied": "denied",
  "approval-requested": "waiting for approval",
  "approval-responded": "approved",
};

export const REJECTION_REASON_LABEL: Record<string, string> = {
  wind_too_low: "wind too low",
  wind_too_high: "wind too strong",
  too_cold: "too cold",
  too_hot: "too hot",
  precipitation_nearby: "rain nearby",
  humidity_too_low: "humidity too low",
  insufficient_data: "missing data",
};

export function isToolPart(part: MessagePart): part is ToolPart {
  return part.type.startsWith("tool-");
}

export function toolName(part: ToolPart): string {
  return part.type.slice("tool-".length);
}

export function toolError(output: unknown): string | null {
  return output && typeof output === "object" && "error" in output ? String(output.error) : null;
}

export function toolErrorLabel(output: unknown): string | null {
  const error = toolError(output);
  return error === null ? null : error.replaceAll("_", " ");
}

export function rejectionSummary(rejectedReasons: Partial<Record<string, number>>): string[] {
  return Object.entries(rejectedReasons)
    .sort(([, left], [, right]) => (right ?? 0) - (left ?? 0))
    .map(([reason, hours]) => `${REJECTION_REASON_LABEL[reason] ?? reason} (${hours} h)`);
}

export function toolInputEntries(input: unknown): Array<[string, string]> {
  if (!input || typeof input !== "object") return [];
  return Object.entries(input).map(([key, value]) => [key, JSON.stringify(value)]);
}

export function formatLocalTime(value: string): string {
  return value.replace("T", " ");
}
