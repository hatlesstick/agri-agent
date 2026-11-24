"use client";

import type React from "react";
import { StatusLabel } from "@/ui/atoms/StatusLabel";
import { sprayDecision } from "@/ui/helpers/spray-decision";
import { TOOL_STATE_LABEL, toolName } from "@/ui/helpers/tool-parts";
import { useT } from "@/ui/hooks/useT";
import { WindowBar } from "@/ui/molecules/WindowBar";
import { ToolOutputSummary } from "@/ui/molecules/ToolOutputSummary";
import type { ToolCallCardProps } from "./ToolCallCard.types";
import { ToolInput } from "./ToolInput";

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ part }) => {
  const t = useT();
  const failed = part.state === "output-error";
  const decision = sprayDecision(part);

  return (
    <div className={`my-2 flex flex-col gap-2 rounded-2xl border bg-surface p-3 text-sm ${failed ? "border-stop" : "border-rule"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{toolName(part)}</span>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${failed ? "border-stop text-stop" : "border-rule text-ink-soft"}`}>
          {TOOL_STATE_LABEL[part.state]}
        </span>
      </div>

      <ToolInput input={part.input} />

      {decision ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusLabel status={decision.status} />
            {decision.range && <span className="tabular-nums text-ink-soft">{decision.range}</span>}
          </div>
          <WindowBar hours={decision.hours} />
          {decision.rejected.length > 0 && <p className="text-xs text-ink-soft">{t("tool.rejected")}: {decision.rejected.join(", ")}</p>}
        </div>
      ) : (
        <ToolOutputSummary part={part} />
      )}

      {failed && <p className="text-stop">{part.errorText}</p>}

      {part.state === "output-available" && (
        <details>
          <summary className="cursor-pointer text-xs text-ink-soft">{t("tool.raw")}</summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded bg-paper p-2 text-xs">{JSON.stringify(part.output, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};
