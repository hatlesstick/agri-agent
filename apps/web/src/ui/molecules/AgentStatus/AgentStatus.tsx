"use client";

import type React from "react";
import { Spinner } from "@/ui/atoms/Spinner";
import { useElapsedSeconds } from "@/ui/hooks/useElapsedSeconds";
import type { AgentStatusProps } from "./AgentStatus.types";

export const AgentStatus: React.FC<AgentStatusProps> = ({ activity, startedAt }) => {
  const seconds = useElapsedSeconds(startedAt);

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
      <Spinner />
      <span>
        {activity.icon} {activity.label}
      </span>
      <span className="ml-auto font-mono text-xs text-zinc-500">
        step {activity.step} · {seconds}s
      </span>
    </div>
  );
};
