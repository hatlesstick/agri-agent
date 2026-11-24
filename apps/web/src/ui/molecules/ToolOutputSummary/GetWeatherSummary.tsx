"use client";

import type React from "react";
import { formatLocalTime } from "@/ui/helpers/tool-parts";
import { useT } from "@/ui/hooks/useT";
import type { GetWeatherSummaryProps } from "./ToolOutputSummary.types";

export const GetWeatherSummary: React.FC<GetWeatherSummaryProps> = ({ output }) => {
  const t = useT();
  if (!output || "error" in output) return null;
  const first = output.hourly[0];
  return (
    <p>
      {t("weather.summary", {
        city: output.city,
        country: output.country,
        count: output.hourly.length,
        from: first ? formatLocalTime(first.time) : "—",
        timezone: output.timezone,
      })}
      {first && first.temperature !== null && t("weather.now", { temp: first.temperature, wind: first.windSpeed ?? "—" })}
    </p>
  );
};
