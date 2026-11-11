import { fetchHourlyForecast, geocodeCity } from "@/domain/weather/open-meteo";
import { todayIn } from "@/domain/time";
import type { Forecast, WeatherResult } from "@/domain/weather/types";

const CACHE_TTL_MS = 15 * 60 * 1000;
export const FORECAST_CACHE_MAX_ENTRIES = 200;

type CacheEntry = { expiresAt: number; localDate: string; forecast: Forecast };

const cache = new Map<string, CacheEntry>();

function cacheKey(city: string): string {
  return city.trim().toLowerCase();
}

function readCache(key: string): Forecast | null {
  const entry = cache.get(key);
  if (!entry) return null;

  cache.delete(key);
  if (entry.expiresAt <= Date.now() || entry.localDate !== todayIn(entry.forecast.timezone)) return null;

  cache.set(key, entry);
  return entry.forecast;
}

function writeCache(key: string, forecast: Forecast): void {
  cache.delete(key);
  while (cache.size >= FORECAST_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, localDate: todayIn(forecast.timezone), forecast });
}

export function clearForecastCache(): void {
  cache.clear();
}

export function forecastCacheSize(): number {
  return cache.size;
}

export async function getForecast(city: string): Promise<WeatherResult> {
  const key = cacheKey(city);
  if (!key) return { error: "city_not_found" };

  const cached = readCache(key);
  if (cached) return cached;

  try {
    const location = await geocodeCity(city.trim());
    if (!location) return { error: "city_not_found" };

    const forecast = await fetchHourlyForecast(location);
    writeCache(key, forecast);
    return forecast;
  } catch {
    return { error: "weather_unavailable" };
  }
}
