import type { AgroAgentUIMessage } from "@/agent";
import { summarizeSteps } from "@/app/_components/agent-activity";
import { isToolPart, ToolCallCard } from "@/app/_components/tool-call-card";

const EMPTY_ANSWER_NOTICE = "The assistant returned no explanation. The tool result above is the answer.";

function hasVisibleText(message: AgroAgentUIMessage): boolean {
  return message.parts.some((part) => part.type === "text" && part.text.trim().length > 0);
}

function hasToolResult(message: AgroAgentUIMessage): boolean {
  return message.parts.some((part) => isToolPart(part) && part.state === "output-available");
}

export function ChatMessage({ message, isComplete }: { message: AgroAgentUIMessage; isComplete: boolean }) {
  if (message.role === "user") {
    return (
      <li className="self-end rounded-lg bg-blue-600 px-4 py-2 text-white">
        {message.parts.map((part, index) =>
          part.type === "text" ? (
            <p key={`${message.id}-${index}`} className="whitespace-pre-wrap">
              {part.text}
            </p>
          ) : null,
        )}
      </li>
    );
  }

  const showEmptyNotice = isComplete && !hasVisibleText(message) && hasToolResult(message);
  const steps = summarizeSteps(message);
  const showTimeline = steps.some((step) => step.tools.length > 0);

  return (
    <li className="w-full max-w-xl self-start rounded-lg bg-zinc-100 px-4 py-2 text-zinc-900">
      {showTimeline && (
        <ol className="mb-1 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
          {steps.map((step, index) => (
            <li key={step.step} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden>→</span>}
              <span className="rounded bg-white px-1.5 py-0.5">
                Step {step.step} ·{" "}
                {step.tools.length > 0
                  ? step.tools.map((tool) => `${tool.name} ${tool.state === "output-available" ? "✓" : tool.state === "output-error" ? "✗" : "…"}`).join(", ")
                  : "answer"}
              </span>
            </li>
          ))}
        </ol>
      )}
      {message.parts.map((part, index) => {
        const key = `${message.id}-${index}`;
        if (part.type === "text") {
          return part.text.trim() ? (
            <p key={key} className="whitespace-pre-wrap">
              {part.text}
            </p>
          ) : null;
        }
        if (isToolPart(part)) return <ToolCallCard key={key} part={part} />;
        return null;
      })}
      {showEmptyNotice && <p className="text-sm italic text-zinc-500">{EMPTY_ANSWER_NOTICE}</p>}
    </li>
  );
}
