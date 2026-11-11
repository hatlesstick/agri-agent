import type { AgroAgentUIMessage } from "@/agent";
import { isToolPart, type ToolPart } from "@/app/_components/tool-call-card";

export type Activity = { icon: string; label: string; step: number };

type MessagePart = AgroAgentUIMessage["parts"][number];

export type StepSummary = { step: number; tools: Array<{ name: string; state: ToolPart["state"] }>; wroteText: boolean };

function toolName(part: ToolPart): string {
  return part.type.slice("tool-".length);
}

function formatInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  return Object.entries(input)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

function countSteps(parts: MessagePart[]): number {
  return parts.filter((part) => part.type === "step-start").length;
}

export function currentActivity(message: AgroAgentUIMessage | undefined): Activity {
  if (!message || message.role !== "assistant") return { icon: "💭", label: "Thinking…", step: 1 };

  const step = Math.max(1, countSteps(message.parts));
  const last = message.parts.findLast((part) => part.type !== "step-start" || part === message.parts.at(-1));
  if (!last || last.type === "step-start") return { icon: "💭", label: "Thinking…", step };

  if (isToolPart(last)) {
    const name = toolName(last);
    switch (last.state) {
      case "input-streaming":
        return { icon: "🔍", label: `Choosing a tool: ${name}…`, step };
      case "input-available":
        return { icon: "🔧", label: `Running ${name} · ${formatInput(last.input)}`, step };
      case "output-error":
        return { icon: "⚠️", label: `${name} failed, recovering…`, step };
      default:
        return { icon: "📊", label: `Analysing the ${name} result…`, step };
    }
  }

  if (last.type === "text") return { icon: "✍️", label: "Writing the answer…", step };
  return { icon: "💭", label: "Thinking…", step };
}

export function summarizeSteps(message: AgroAgentUIMessage): StepSummary[] {
  const steps: StepSummary[] = [];
  for (const part of message.parts) {
    if (part.type === "step-start" || steps.length === 0) {
      steps.push({ step: steps.length + 1, tools: [], wroteText: false });
      if (part.type === "step-start") continue;
    }
    const current = steps[steps.length - 1];
    if (isToolPart(part)) current.tools.push({ name: toolName(part), state: part.state });
    if (part.type === "text" && part.text.trim()) current.wroteText = true;
  }
  return steps.filter((step) => step.tools.length > 0 || step.wroteText);
}
