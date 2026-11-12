import { tool } from "ai";
import { clockContextSchema } from "@/agent/tools/shared/schemas";
import {
  sprayOutlookInputSchema,
  sprayOutlookOutputSchema,
  type SprayOutlookInput,
  type SprayOutlookOutput,
} from "@/agent/tools/spray-outlook/schemas";
import { currentLocalHour, todayIn } from "@/shared/helpers/time";
import { sprayWindowService } from "@/server/services/spray-window/SprayWindowService";
import { weatherRepository } from "@/server/repositories/weather/WeatherRepository";
import { isWeatherError } from "@/server/repositories/weather/weather.types";

export async function sprayOutlook(input: SprayOutlookInput, now: Date = new Date()): Promise<SprayOutlookOutput> {
  const forecast = await weatherRepository.getForecast(input.city);
  if (isWeatherError(forecast)) return sprayOutlookOutputSchema.parse(forecast);

  const today = todayIn(forecast.timezone, now);
  const dates = [...new Set(forecast.hourly.map((point) => point.time.slice(0, 10)))].filter((date) => date >= today);

  return sprayOutlookOutputSchema.parse({
    city: forecast.city,
    timezone: forecast.timezone,
    days: dates.map((date) => {
      const { canSpray, bestWindow, rejectedReasons } = sprayWindowService.assess({
        hourly: forecast.hourly,
        date,
        options: { notBefore: currentLocalHour(forecast.timezone, now) },
      });
      return { date, canSpray, bestWindow, rejectedReasons };
    }),
  });
}

export const sprayOutlookTool = tool({
  description:
    "Assess spraying conditions for every remaining forecast day (up to 3 days) in a city with one call. Use it for questions like 'when can I spray', 'which day', 'this week' or when no specific day is given. Returns canSpray and the best window per day in city-local time; report it, never override it.",
  inputSchema: sprayOutlookInputSchema,
  outputSchema: sprayOutlookOutputSchema,
  contextSchema: clockContextSchema,
  execute: (input, { context }) => sprayOutlook(input, context.now),
});
