import { OpenMeteoClient } from "@/server/repositories/weather/OpenMeteoClient";
import type { Forecast, WeatherResult } from "@/server/repositories/weather/weather.types";
import { todayIn } from "@/shared/helpers/time";

const CACHE_TTL_MS = 15 * 60 * 1000;
export const FORECAST_CACHE_MAX_ENTRIES = 200;

type CacheEntry = { expiresAt: number; localDate: string; forecast: Forecast };

function cacheKey(city: string): string {
  return city.trim().toLowerCase();
}

export class WeatherRepository {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly client: OpenMeteoClient = new OpenMeteoClient(),
    private readonly maxEntries: number = FORECAST_CACHE_MAX_ENTRIES,
  ) {}

  get cacheSize(): number {
    return this.cache.size;
  }

  clearCache(): void {
    this.cache.clear();
  }

  async getForecast(city: string): Promise<WeatherResult> {
    const key = cacheKey(city);
    if (!key) return { error: "city_not_found" };

    const cached = this.readCache(key);
    if (cached) return cached;

    try {
      const location = await this.client.geocodeCity(city.trim());
      if (!location) return { error: "city_not_found" };

      const forecast = await this.client.fetchHourlyForecast(location);
      this.writeCache(key, forecast);
      return forecast;
    } catch {
      return { error: "weather_unavailable" };
    }
  }

  private readCache(key: string): Forecast | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    this.cache.delete(key);
    if (entry.expiresAt <= Date.now() || entry.localDate !== todayIn(entry.forecast.timezone)) return null;

    this.cache.set(key, entry);
    return entry.forecast;
  }

  private writeCache(key: string, forecast: Forecast): void {
    this.cache.delete(key);
    while (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey === undefined) break;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, localDate: todayIn(forecast.timezone), forecast });
  }
}

export const weatherRepository = new WeatherRepository();
