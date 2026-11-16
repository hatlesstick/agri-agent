import type { AgriAgentUIMessage } from "@/agent";
import { summarizeSteps, type StepSummary } from "@/ui/helpers/agent-activity";
import { isToolPart } from "@/ui/helpers/tool-parts";

export const EMPTY_ANSWER_NOTICE = "The assistant returned no explanation. The tool result above is the answer.";

export type AssistantMessageView = { steps: StepSummary[]; showTimeline: boolean; showEmptyNotice: boolean };

function hasVisibleText(message: AgriAgentUIMessage): boolean {
  return message.parts.some((part) => part.type === "text" && part.text.trim().length > 0);
}

function hasToolResult(message: AgriAgentUIMessage): boolean {
  return message.parts.some((part) => isToolPart(part) && part.state === "output-available");
}

export function assistantMessageView(message: AgriAgentUIMessage, isComplete: boolean): AssistantMessageView {
  const steps = summarizeSteps(message);
  return {
    steps,
    showTimeline: steps.some((step) => step.tools.length > 0),
    showEmptyNotice: isComplete && !hasVisibleText(message) && hasToolResult(message),
  };
}

export function stepStateMark(state: string): string {
  if (state === "output-available") return "✓";
  if (state === "output-error") return "✗";
  return "…";
}

export function stepLabel(step: StepSummary): string {
  if (step.tools.length === 0) return "answer";
  return step.tools.map((tool) => `${tool.name} ${stepStateMark(tool.state)}`).join(", ");
}
