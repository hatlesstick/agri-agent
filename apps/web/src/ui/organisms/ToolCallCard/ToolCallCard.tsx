import type React from "react";
import { Badge } from "@/ui/atoms/Badge";
import { TOOL_STATE_LABEL, toolName } from "@/ui/helpers/tool-parts";
import { ToolOutputSummary } from "@/ui/molecules/ToolOutputSummary";
import type { ToolCallCardProps } from "./ToolCallCard.types";
import { ToolInput } from "./ToolInput";

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ part }) => {
  const failed = part.state === "output-error";

  return (
    <div className={`my-2 rounded-md border bg-white p-3 text-sm ${failed ? "border-red-300" : "border-zinc-200"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-semibold">🔧 {toolName(part)}</span>
        <Badge tone={failed ? "danger" : "neutral"}>{TOOL_STATE_LABEL[part.state]}</Badge>
      </div>

      <ToolInput input={part.input} />

      <div className="mt-2">
        <ToolOutputSummary part={part} />
        {failed && <p className="text-red-700">{part.errorText}</p>}
      </div>

      {part.state === "output-available" && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-500">Raw output</summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded bg-zinc-50 p-2 text-xs">{JSON.stringify(part.output, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};
