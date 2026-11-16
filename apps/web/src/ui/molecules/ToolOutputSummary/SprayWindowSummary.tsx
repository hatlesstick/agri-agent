import type React from "react";
import { formatLocalTime, rejectionSummary } from "@/ui/helpers/tool-parts";
import type { SprayWindowSummaryProps } from "./ToolOutputSummary.types";

export const SprayWindowSummary: React.FC<SprayWindowSummaryProps> = ({ output }) => {
  if (!output || "error" in output) return null;
  const reasons = rejectionSummary(output.rejectedReasons);

  return (
    <div className="space-y-1">
      <p className="font-medium">
        {output.canSpray ? "✅ Spraying possible" : "❌ No suitable window"} · {output.city}, {output.date}
      </p>
      {output.bestWindow && (
        <p>
          Best window: {formatLocalTime(output.bestWindow.from)} → {formatLocalTime(output.bestWindow.to)} ({output.bestWindow.hours} h,{" "}
          {output.timezone})
        </p>
      )}
      {reasons.length > 0 && <p className="text-zinc-600">Rejected hours: {reasons.join(", ")}</p>}
    </div>
  );
};
