import type React from "react";
import { useT } from "@/ui/hooks/useT";
import type { SourceListProps } from "./SourceList.types";

export const SourceList: React.FC<SourceListProps> = ({ sources }) => {
  const t = useT();
  if (sources.length === 0) return <p className="text-sm text-ink-soft">{t("sources.empty")}</p>;
  return (
    <ul aria-label={t("sources.title")} className="flex flex-col gap-1 text-sm">
      {sources.map((source) => (
        <li key={`${source.title}-${source.updatedAt ?? ""}`}>
          <span className="font-semibold">{source.title}</span>
          {source.updatedAt && <span className="text-ink-soft"> · {t("sources.updated", { time: source.updatedAt })}</span>}
        </li>
      ))}
    </ul>
  );
};
