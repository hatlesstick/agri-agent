import type React from "react";
import { StatusLabel } from "@/ui/atoms/StatusLabel";
import { useT } from "@/ui/hooks/useT";
import type { HourBarProps } from "./HourBar.types";

export const HourBar: React.FC<HourBarProps> = ({ time, status, windMs, precipMm, selected, onSelect }) => {
  const t = useT();
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-rule px-3 py-2 text-left aria-pressed:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
    >
      <span className="font-display font-semibold tabular-nums">{time}</span>
      <StatusLabel status={status} />
      <span className="text-sm text-ink-soft tabular-nums">{t("hour.wind", { value: windMs.toFixed(1) })}</span>
      <span className="text-sm text-sky tabular-nums">
        {precipMm.toFixed(1)} {t("unit.mm")}
      </span>
    </button>
  );
};
