"use client";

import type React from "react";
import { Spinner } from "@/ui/atoms/Spinner";
import { useElapsedSeconds } from "@/ui/hooks/useElapsedSeconds";
import { useT } from "@/ui/hooks/useT";
import type { AgentStatusProps } from "./AgentStatus.types";

export const AgentStatus: React.FC<AgentStatusProps> = ({ activity, startedAt }) => {
  const seconds = useElapsedSeconds(startedAt);
  const t = useT();

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-rule bg-surface px-4 py-2 text-sm text-ink-soft">
      <Spinner />
      <span>
        {activity.icon} {activity.label}
      </span>
      <span className="ml-auto tabular-nums text-xs">{t("chat.step", { step: activity.step, seconds })}</span>
    </div>
  );
};
