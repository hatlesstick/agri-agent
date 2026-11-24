import type React from "react";
import { HourBar } from "@/ui/molecules/HourBar";
import { useHourSelection } from "@/ui/hooks/useHourSelection";
import { useT } from "@/ui/hooks/useT";
import type { HourStripProps } from "./HourStrip.types";

export const HourStrip: React.FC<HourStripProps> = ({ hours }) => {
  const t = useT();
  const [selected, select] = useHourSelection(hours);
  const current = hours[selected];
  const spray = hours.filter((hour) => hour.status === "go").length;
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-rule bg-surface p-4">
      <h2 className="font-display text-xl font-bold">{t("strip.headline", { count: spray })}</h2>
      <div className="flex flex-col gap-2">
        {hours.map((hour, index) => (
          <HourBar
            key={hour.time}
            time={hour.time}
            status={hour.status}
            windMs={hour.windMs}
            precipMm={hour.precipMm}
            selected={index === selected}
            onSelect={() => select(index)}
          />
        ))}
      </div>
      {current && (
        <p className="text-sm text-ink-soft">
          {current.time} · {current.windMs === null ? "—" : t("hour.wind", { value: current.windMs.toFixed(1) })}
        </p>
      )}
    </section>
  );
};
