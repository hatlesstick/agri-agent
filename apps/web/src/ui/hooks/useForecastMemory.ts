"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgriChatMessage } from "@agri/shared/contracts";
import { buildForecast, type StoredForecast } from "@/ui/helpers/forecast-memory";
import { forecastKeys, readStoredForecast, writeStoredForecast } from "@/ui/queries/forecast-queries";

export function useSaveForecast(messages: AgriChatMessage[]): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    const forecast = buildForecast(messages);
    if (!forecast) return;
    writeStoredForecast(forecast);
    queryClient.setQueryData(forecastKeys.last, forecast);
  }, [messages, queryClient]);
}

export function useStoredForecast(): StoredForecast | null {
  const queryClient = useQueryClient();
  useEffect(() => {
    const onStorage = () => void queryClient.invalidateQueries({ queryKey: forecastKeys.last });
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);
  const { data } = useQuery({ queryKey: forecastKeys.last, queryFn: readStoredForecast, staleTime: Infinity });
  return data ?? null;
}
