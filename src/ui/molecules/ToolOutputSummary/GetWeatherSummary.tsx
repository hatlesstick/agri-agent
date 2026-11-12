import type React from "react";
import { formatLocalTime } from "@/ui/helpers/tool-parts";
import type { GetWeatherSummaryProps } from "./ToolOutputSummary.types";

export const GetWeatherSummary: React.FC<GetWeatherSummaryProps> = ({ output }) => {
  if (!output || "error" in output) return null;
  const first = output.hourly[0];
  return (
    <p>
      🌤 {output.city}, {output.country} · {output.hourly.length} hours from {first ? formatLocalTime(first.time) : "—"} ({output.timezone})
      {first && first.temperature !== null && ` · now ${first.temperature} °C, wind ${first.windSpeed ?? "—"} m/s`}
    </p>
  );
};
