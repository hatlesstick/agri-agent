import { tool } from "ai";
import type { WeatherPort } from "@/ports";
import {
  getWeatherInputSchema,
  getWeatherOutputSchema,
  type GetWeatherInput,
  type GetWeatherOutput,
} from "@agri/shared/contracts";
import type { WeatherToolDeps } from "@/tools/shared/deps";
import { clockContextSchema } from "@/tools/shared/schemas";
import { currentLocalHour } from "@agri/shared";
import { isWeatherError, type HourlyPoint } from "@/weather/weather.types";

export const WEATHER_HOURS_FOR_MODEL = 48;

function roundToTenth(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function roundPoint(point: HourlyPoint): HourlyPoint {
  return {
    time: point.time,
    temperature: roundToTenth(point.temperature),
    windSpeed: roundToTenth(point.windSpeed),
    precipitation: roundToTenth(point.precipitation),
    precipitationProbability: roundToTenth(point.precipitationProbability),
    humidity: roundToTenth(point.humidity),
  };
}

export async function getWeather(input: GetWeatherInput, { weather, now = new Date() }: WeatherToolDeps): Promise<GetWeatherOutput> {
  const forecast = await weather.getForecast(input.city);
  if (isWeatherError(forecast)) return getWeatherOutputSchema.parse(forecast);

  const fromHour = currentLocalHour(forecast.timezone, now);
  const hourly = forecast.hourly
    .filter((point) => point.time >= fromHour)
    .slice(0, WEATHER_HOURS_FOR_MODEL)
    .map(roundPoint);

  return getWeatherOutputSchema.parse({
    city: forecast.city,
    country: forecast.country,
    region: forecast.region,
    latitude: forecast.latitude,
    longitude: forecast.longitude,
    timezone: forecast.timezone,
    hourly,
  });
}

export function createGetWeatherTool(weather: WeatherPort) {
  return tool({
    description:
      "Get the hourly weather forecast (next 48 hours, city-local time) for a city: temperature °C, wind m/s, precipitation mm, precipitation probability %, relative humidity %.",
    inputSchema: getWeatherInputSchema,
    outputSchema: getWeatherOutputSchema,
    contextSchema: clockContextSchema,
    execute: (input, { context }) => getWeather(input, { weather, now: context.now }),
  });
}
