import type React from "react";
import { Markdown } from "@/ui/atoms/Markdown";
import { assistantMessageView, EMPTY_ANSWER_NOTICE } from "@/ui/helpers/message-view";
import { isToolPart } from "@/ui/helpers/tool-parts";
import { StepTimeline } from "@/ui/molecules/StepTimeline";
import { ToolCallCard } from "@/ui/organisms/ToolCallCard";
import type { AssistantMessageProps } from "./ChatMessage.types";

export const AssistantMessage: React.FC<AssistantMessageProps> = ({ message, isComplete }) => {
  const view = assistantMessageView(message, isComplete);

  return (
    <li className="w-full max-w-xl self-start rounded-lg bg-zinc-100 px-4 py-2 text-zinc-900">
      {view.showTimeline && <StepTimeline steps={view.steps} />}
      {message.parts.map((part, index) => {
        const key = `${message.id}-${index}`;
        if (part.type === "text") return part.text.trim() ? <Markdown key={key} text={part.text} /> : null;
        if (isToolPart(part)) return <ToolCallCard key={key} part={part} />;
        return null;
      })}
      {view.showEmptyNotice && <p className="text-sm italic text-zinc-500">{EMPTY_ANSWER_NOTICE}</p>}
    </li>
  );
};
