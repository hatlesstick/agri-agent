import type React from "react";
import { toolInputEntries } from "@/ui/helpers/tool-parts";
import type { ToolInputProps } from "./ToolCallCard.types";

export const ToolInput: React.FC<ToolInputProps> = ({ input }) => {
  const entries = toolInputEntries(input);
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 font-mono text-xs text-zinc-600">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
};
