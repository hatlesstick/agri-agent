import { InMemoryCacheStore, type CacheStore } from "@/common/cache";
import { OpenMeteoClient } from "@/modules/weather/OpenMeteoClient";
import type { Forecast, WeatherPort, WeatherResult } from "@/modules/weather/weather.types";
import { todayIn } from "@agri/shared";

const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_PREFIX = "weather:forecast:";
export const FORECAST_CACHE_MAX_ENTRIES = 200;

type CacheEntry = { localDate: string; forecast: Forecast };

function cacheKey(city: string): string {
  return city.trim().toLowerCase();
}

export class WeatherRepository implements WeatherPort {
  constructor(
    private readonly client: OpenMeteoClient = new OpenMeteoClient(),
    private readonly cache: CacheStore = new InMemoryCacheStore({ maxEntries: FORECAST_CACHE_MAX_ENTRIES }),
  ) {}

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  async getForecast(city: string): Promise<WeatherResult> {
    const key = cacheKey(city);
    if (!key) return { error: "city_not_found" };

    const cached = await this.readCache(key);
    if (cached) return cached;

    try {
      const location = await this.client.geocodeCity(city.trim());
      if (!location) return { error: "city_not_found" };

      const forecast = await this.client.fetchHourlyForecast(location);
      await this.cache.set<CacheEntry>(CACHE_PREFIX + key, { localDate: todayIn(forecast.timezone), forecast }, CACHE_TTL_MS);
      return forecast;
    } catch {
      return { error: "weather_unavailable" };
    }
  }

  private async readCache(key: string): Promise<Forecast | null> {
    const entry = await this.cache.get<CacheEntry>(CACHE_PREFIX + key);
    if (!entry) return null;
    if (entry.localDate !== todayIn(entry.forecast.timezone)) {
      await this.cache.delete(CACHE_PREFIX + key);
      return null;
    }
    return entry.forecast;
  }
}
