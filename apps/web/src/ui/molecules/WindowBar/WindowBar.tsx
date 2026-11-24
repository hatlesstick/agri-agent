import type React from "react";
import { useT } from "@/ui/hooks/useT";
import type { WindowBarProps } from "./WindowBar.types";

export const WindowBar: React.FC<WindowBarProps> = ({ hours }) => {
  const t = useT();
  const count = hours.filter((hour) => hour.status === "go").length;
  return (
    <div role="img" aria-label={t("strip.headline", { count })} className="flex h-3 w-full gap-0.5">
      {hours.map((hour) => (
        <span key={hour.time} className={`flex-1 rounded-sm ${hour.status === "go" ? "bg-go-strong" : "bg-rule"}`} />
      ))}
    </div>
  );
};
