"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { AgriChatMessage } from "@agri/shared/contracts";
import { buildForecast, FORECAST_STORAGE_KEY, parseStoredForecast, type StoredForecast } from "@/ui/helpers/forecast-memory";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

const readRaw = (): string | null => {
  try {
    return window.localStorage.getItem(FORECAST_STORAGE_KEY);
  } catch {
    return null;
  }
};

export function useSaveForecast(messages: AgriChatMessage[]): void {
  useEffect(() => {
    const forecast = buildForecast(messages);
    if (!forecast) return;
    try {
      window.localStorage.setItem(FORECAST_STORAGE_KEY, JSON.stringify(forecast));
    } catch {
      return;
    }
  }, [messages]);
}

export function useStoredForecast(): StoredForecast | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parseStoredForecast(raw), [raw]);
}
