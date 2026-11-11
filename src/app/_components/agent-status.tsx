"use client";

import { useEffect, useState } from "react";
import type { Activity } from "@/app/_components/agent-activity";

export function AgentStatus({ activity, startedAt }: { activity: Activity; startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  const seconds = Math.max(0, (now - startedAt) / 1000).toFixed(1);

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
      <span>
        {activity.icon} {activity.label}
      </span>
      <span className="ml-auto font-mono text-xs text-zinc-500">
        step {activity.step} · {seconds}s
      </span>
    </div>
  );
}
