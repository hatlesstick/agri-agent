import type { ToolOutput, ToolPart } from "@/ui/helpers/tool-parts";

export type ToolOutputSummaryProps = { part: ToolPart };

export type SprayWindowSummaryProps = { output: ToolOutput<"sprayWindow"> };

export type SprayOutlookSummaryProps = { output: ToolOutput<"sprayOutlook"> };

export type SearchDocsSummaryProps = { output: ToolOutput<"searchDocs"> };

export type GetWeatherSummaryProps = { output: ToolOutput<"getWeather"> };
