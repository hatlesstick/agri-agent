"use client";

import type React from "react";
import { formatLocalTime } from "@/ui/helpers/tool-parts";
import { useT } from "@/ui/hooks/useT";
import type { SprayOutlookSummaryProps } from "./ToolOutputSummary.types";

export const SprayOutlookSummary: React.FC<SprayOutlookSummaryProps> = ({ output }) => {
  const t = useT();
  if (!output || "error" in output) return null;
  return (
    <ul className="flex flex-col gap-1">
      {output.days.map((day) => (
        <li key={day.date}>
          {day.canSpray ? "✅" : "❌"} {day.date}
          {day.bestWindow
            ? ` · ${formatLocalTime(day.bestWindow.from)} → ${formatLocalTime(day.bestWindow.to)} (${day.bestWindow.hours} h)`
            : ` · ${t("tool.noWindow")}`}
        </li>
      ))}
      <li className="text-ink-soft">
        {output.city}, {output.timezone}
      </li>
    </ul>
  );
};
