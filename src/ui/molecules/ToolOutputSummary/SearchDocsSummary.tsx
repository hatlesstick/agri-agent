import type React from "react";
import type { SearchDocsSummaryProps } from "./ToolOutputSummary.types";

export const SearchDocsSummary: React.FC<SearchDocsSummaryProps> = ({ output }) => {
  if (!output || "error" in output) return null;
  if (output.hits.length === 0) return <p className="text-zinc-600">📚 No relevant passages found</p>;
  return (
    <ul className="space-y-1">
      {output.hits.map((hit) => (
        <li key={hit.id}>
          📚 {hit.title} — {hit.heading} <span className="text-zinc-500">({hit.score.toFixed(2)})</span>
          <div className="text-xs text-zinc-500">{hit.source}</div>
        </li>
      ))}
    </ul>
  );
};
