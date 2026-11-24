"use client";

import type React from "react";
import { HourStrip } from "@/ui/organisms/HourStrip";
import { buildHourStrip } from "@/ui/helpers/hour-strip";
import { useStoredForecast } from "@/ui/hooks/useForecastMemory";
import { useT } from "@/ui/hooks/useT";

export const TodayForecast: React.FC = () => {
  const forecast = useStoredForecast();
  const t = useT();
  if (!forecast) return null;
  const hours = buildHourStrip({ date: forecast.date, windows: forecast.windows, hourly: forecast.hourly });
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-soft">{t("forecast.for", { city: forecast.city })}</p>
      <HourStrip hours={hours} />
    </div>
  );
};
