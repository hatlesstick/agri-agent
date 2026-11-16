import { tool } from "ai";
import {
  getWeatherInputSchema,
  getWeatherOutputSchema,
  type GetWeatherInput,
  type GetWeatherOutput,
} from "@/agent/tools/get-weather/schemas";
import { clockContextSchema } from "@/agent/tools/shared/schemas";
import { currentLocalHour } from "@/shared/helpers/time";
import { weatherRepository } from "@/server/repositories/weather/WeatherRepository";
import { isWeatherError, type HourlyPoint } from "@/server/repositories/weather/weather.types";

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

export async function getWeather(input: GetWeatherInput, now: Date = new Date()): Promise<GetWeatherOutput> {
  const forecast = await weatherRepository.getForecast(input.city);
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
  contextSchema: clockContextSchema,
  execute: (input, { context }) => getWeather(input, context.now),
});
