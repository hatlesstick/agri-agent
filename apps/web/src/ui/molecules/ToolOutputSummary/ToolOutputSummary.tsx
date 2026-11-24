"use client";

import type React from "react";
import { toolErrorLabel } from "@/ui/helpers/tool-parts";
import { useT } from "@/ui/hooks/useT";
import { GetWeatherSummary } from "./GetWeatherSummary";
import { SearchDocsSummary } from "./SearchDocsSummary";
import { SprayOutlookSummary } from "./SprayOutlookSummary";
import { SprayWindowSummary } from "./SprayWindowSummary";
import type { ToolOutputSummaryProps } from "./ToolOutputSummary.types";

export const ToolOutputSummary: React.FC<ToolOutputSummaryProps> = ({ part }) => {
  const t = useT();
  if (part.state !== "output-available") return null;
  const error = toolErrorLabel(part.output);
  if (error) return <p className="text-stop">{t("tool.error", { error })}</p>;
  if (part.type === "tool-sprayWindow") return <SprayWindowSummary output={part.output} />;
  if (part.type === "tool-getWeather") return <GetWeatherSummary output={part.output} />;
  if (part.type === "tool-sprayOutlook") return <SprayOutlookSummary output={part.output} />;
  if (part.type === "tool-searchDocs") return <SearchDocsSummary output={part.output} />;
  return null;
};
