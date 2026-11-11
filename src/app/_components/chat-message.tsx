import type { AgroAgentUIMessage } from "@/agent";
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

  return (
    <li className="w-full max-w-xl self-start rounded-lg bg-zinc-100 px-4 py-2 text-zinc-900">
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
