"use client";

import type React from "react";
import { useT } from "@/ui/hooks/useT";
import type { SearchDocsSummaryProps } from "./ToolOutputSummary.types";

export const SearchDocsSummary: React.FC<SearchDocsSummaryProps> = ({ output }) => {
  const t = useT();
  if (!output || "error" in output) return null;
  if (output.hits.length === 0) return <p className="text-ink-soft">{t("tool.noPassages")}</p>;
  return (
    <ul className="flex flex-col gap-1">
      {output.hits.map((hit) => (
        <li key={hit.id}>
          📚 {hit.title} — {hit.heading} <span className="text-ink-soft">({hit.score.toFixed(2)})</span>
          <div className="text-xs text-ink-soft">{hit.source}</div>
        </li>
      ))}
    </ul>
  );
};
