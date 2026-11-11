import { fetchHourlyForecast, geocodeCity } from "@/features/weather/open-meteo";
import type { Forecast, WeatherResult } from "@/features/weather/types";

const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheEntry = { expiresAt: number; forecast: Forecast };

const cache = new Map<string, CacheEntry>();

function cacheKey(city: string): string {
  return city.trim().toLowerCase();
}

export function clearForecastCache(): void {
  cache.clear();
}

export async function getForecast(city: string): Promise<WeatherResult> {
  const key = cacheKey(city);
  if (!key) return { error: "city_not_found" };

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.forecast;

  try {
    const location = await geocodeCity(city.trim());
    if (!location) return { error: "city_not_found" };

    const forecast = await fetchHourlyForecast(location);
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, forecast });
    return forecast;
  } catch {
    return { error: "weather_unavailable" };
  }
}
