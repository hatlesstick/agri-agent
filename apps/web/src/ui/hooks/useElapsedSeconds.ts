"use client";

import { useEffect, useState } from "react";

export function useElapsedSeconds(startedAt: number, intervalMs = 200): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return Math.max(0, (now - startedAt) / 1000).toFixed(1);
}
