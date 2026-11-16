import { tool } from "ai";
import type { WeatherPort } from "@/ports";
import type { WeatherToolDeps } from "@/tools/shared/deps";
import { clockContextSchema } from "@/tools/shared/schemas";
import {
  sprayOutlookInputSchema,
  sprayOutlookOutputSchema,
  type SprayOutlookInput,
  type SprayOutlookOutput,
} from "@agri/shared/contracts";
import { currentLocalHour, todayIn } from "@agri/shared";
import { assessSprayDay } from "@/spray-window/assess-spray-day";
import { isWeatherError } from "@/weather/weather.types";

export async function sprayOutlook(input: SprayOutlookInput, { weather, now = new Date() }: WeatherToolDeps): Promise<SprayOutlookOutput> {
  const forecast = await weather.getForecast(input.city);
  if (isWeatherError(forecast)) return sprayOutlookOutputSchema.parse(forecast);

  const today = todayIn(forecast.timezone, now);
  const dates = [...new Set(forecast.hourly.map((point) => point.time.slice(0, 10)))].filter((date) => date >= today);

  return sprayOutlookOutputSchema.parse({
    city: forecast.city,
    timezone: forecast.timezone,
    days: dates.map((date) => {
      const { canSpray, bestWindow, rejectedReasons } = assessSprayDay({
        hourly: forecast.hourly,
        date,
        options: { notBefore: currentLocalHour(forecast.timezone, now) },
      });
      return { date, canSpray, bestWindow, rejectedReasons };
    }),
  });
}

export function createSprayOutlookTool(weather: WeatherPort) {
  return tool({
    description:
      "Assess spraying conditions for every remaining forecast day (up to 3 days) in a city with one call. Use it for questions like 'when can I spray', 'which day', 'this week' or when no specific day is given. Returns canSpray and the best window per day in city-local time; report it, never override it.",
    inputSchema: sprayOutlookInputSchema,
    outputSchema: sprayOutlookOutputSchema,
    contextSchema: clockContextSchema,
    execute: (input, { context }) => sprayOutlook(input, { weather, now: context.now }),
  });
}
