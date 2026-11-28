import { FORECAST_STORAGE_KEY, parseStoredForecast, type StoredForecast } from "@/ui/helpers/forecast-memory";

export const forecastKeys = {
  last: ["forecast", "last"] as const,
};

export function readStoredForecast(): StoredForecast | null {
  try {
    return parseStoredForecast(window.localStorage.getItem(FORECAST_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredForecast(forecast: StoredForecast): void {
  try {
    window.localStorage.setItem(FORECAST_STORAGE_KEY, JSON.stringify(forecast));
  } catch {
    return;
  }
}
