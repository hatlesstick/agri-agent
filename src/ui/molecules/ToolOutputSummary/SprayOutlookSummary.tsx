import type React from "react";
import { formatLocalTime } from "@/ui/helpers/tool-parts";
import type { SprayOutlookSummaryProps } from "./ToolOutputSummary.types";

export const SprayOutlookSummary: React.FC<SprayOutlookSummaryProps> = ({ output }) => {
  if (!output || "error" in output) return null;
  return (
    <ul className="space-y-1">
      {output.days.map((day) => (
        <li key={day.date}>
          {day.canSpray ? "✅" : "❌"} {day.date}
          {day.bestWindow
            ? ` · ${formatLocalTime(day.bestWindow.from)} → ${formatLocalTime(day.bestWindow.to)} (${day.bestWindow.hours} h)`
            : " · no window"}
        </li>
      ))}
      <li className="text-zinc-500">
        {output.city}, {output.timezone}
      </li>
    </ul>
  );
};
