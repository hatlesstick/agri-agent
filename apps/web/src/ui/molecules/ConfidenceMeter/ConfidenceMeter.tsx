import type React from "react";
import { useT } from "@/ui/hooks/useT";
import type { ConfidenceMeterProps } from "./ConfidenceMeter.types";

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ value }) => {
  const t = useT();
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="flex items-center gap-3">
      <div role="meter" aria-label={t("confidence.label")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 w-28 overflow-hidden rounded-full bg-rule">
        <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-sm tabular-nums text-ink-soft">{percent}%</span>
    </div>
  );
};
