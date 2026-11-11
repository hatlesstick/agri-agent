import { tool } from "ai";
import {
  getWeatherInputSchema,
  getWeatherOutputSchema,
  type GetWeatherInput,
  type GetWeatherOutput,
} from "@/features/weather/schemas";
import { getForecast } from "@/features/weather/forecast";
import { isWeatherError, type HourlyPoint } from "@/features/weather/types";

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

export function currentLocalHour(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:00`;
}

export async function getWeather(input: GetWeatherInput, now: Date = new Date()): Promise<GetWeatherOutput> {
  const forecast = await getForecast(input.city);
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

export const getWeatherTool = tool({
  description:
    "Get the hourly weather forecast (next 48 hours, city-local time) for a city: temperature °C, wind m/s, precipitation mm, precipitation probability %, relative humidity %.",
  inputSchema: getWeatherInputSchema,
  outputSchema: getWeatherOutputSchema,
  execute: (input) => getWeather(input),
});
