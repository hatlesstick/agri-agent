import { serverEnv } from "@/config/env";
import { currentLocalHour } from "@/domain/time";
import {
  forecastResponseSchema,
  geocodingResponseSchema,
  HOURLY_VARIABLES,
} from "@/domain/weather/schemas";
import type { Forecast, GeoLocation, HourlyPoint } from "@/domain/weather/types";

const REQUEST_TIMEOUT_MS = 8000;
const FORECAST_DAYS = 3;

export class OpenMeteoError extends Error {}

async function getJson(url: URL): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    throw new OpenMeteoError(`Open-Meteo responded with ${response.status}`);
  }
  return response.json();
}

export async function geocodeCity(name: string): Promise<GeoLocation | null> {
  const url = new URL(serverEnv().OPEN_METEO_GEOCODING_URL);
  url.search = new URLSearchParams({ name, count: "1", language: "en" }).toString();

  const { results } = geocodingResponseSchema.parse(await getJson(url));
  const match = results?.[0];
  if (!match) return null;

  return {
    name: match.name,
    country: match.country,
    region: match.admin1 ?? null,
    latitude: match.latitude,
    longitude: match.longitude,
  };
}

export async function fetchHourlyForecast(location: GeoLocation): Promise<Forecast> {
  const url = new URL(serverEnv().OPEN_METEO_FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: Object.values(HOURLY_VARIABLES).join(","),
    wind_speed_unit: "ms",
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: String(FORECAST_DAYS),
  }).toString();

  const { timezone, hourly } = forecastResponseSchema.parse(await getJson(url));
  const valueAt = (series: Array<number | null>, index: number) => series[index] ?? null;

  const points: HourlyPoint[] = hourly.time.map((unixSeconds, index) => ({
    time: currentLocalHour(timezone, new Date(unixSeconds * 1000)),
    temperature: valueAt(hourly[HOURLY_VARIABLES.temperature], index),
    windSpeed: valueAt(hourly[HOURLY_VARIABLES.windSpeed], index),
    precipitation: valueAt(hourly[HOURLY_VARIABLES.precipitation], index),
    precipitationProbability: valueAt(hourly[HOURLY_VARIABLES.precipitationProbability], index),
    humidity: valueAt(hourly[HOURLY_VARIABLES.humidity], index),
  }));

  return {
    city: location.name,
    country: location.country,
    region: location.region,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone,
    hourly: points,
  };
}
