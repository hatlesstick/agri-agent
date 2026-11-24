"use client";

import type React from "react";
import { formatLocalTime, rejectionSummary } from "@/ui/helpers/tool-parts";
import { useT } from "@/ui/hooks/useT";
import type { SprayWindowSummaryProps } from "./ToolOutputSummary.types";

export const SprayWindowSummary: React.FC<SprayWindowSummaryProps> = ({ output }) => {
  const t = useT();
  if (!output || "error" in output) return null;
  const reasons = rejectionSummary(output.rejectedReasons);

  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold">
        {output.canSpray ? t("tool.possible") : t("tool.notPossible")} · {output.city}, {output.date}
      </p>
      {output.bestWindow && (
        <p>
          {t("tool.bestWindow", {
            from: formatLocalTime(output.bestWindow.from),
            to: formatLocalTime(output.bestWindow.to),
            hours: output.bestWindow.hours,
            timezone: output.timezone,
          })}
        </p>
      )}
      {reasons.length > 0 && (
        <p className="text-ink-soft">
          {t("tool.rejected")}: {reasons.join(", ")}
        </p>
      )}
    </div>
  );
};
