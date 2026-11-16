import { tool } from "ai";
import {
  sprayWindowInputSchema,
  sprayWindowOutputSchema,
  type SprayWindowInput,
  type SprayWindowOutput,
} from "@/agent/tools/spray-window/schemas";
import { clockContextSchema } from "@/agent/tools/shared/schemas";
import { resolveDay } from "@/shared/helpers/relative-day";
import { currentLocalHour, todayIn } from "@/shared/helpers/time";
import { sprayWindowService } from "@/server/services/spray-window/SprayWindowService";
import { weatherRepository } from "@/server/repositories/weather/WeatherRepository";
import { isWeatherError } from "@/server/repositories/weather/weather.types";

export async function sprayWindow(input: SprayWindowInput, now: Date = new Date()): Promise<SprayWindowOutput> {
  const forecast = await weatherRepository.getForecast(input.city);
  if (isWeatherError(forecast)) return sprayWindowOutputSchema.parse(forecast);

  const date = resolveDay(input.date, forecast.timezone, now);
  if (date < todayIn(forecast.timezone, now)) {
    return sprayWindowOutputSchema.parse({ error: "date_in_past" });
  }
  if (!forecast.hourly.some((point) => point.time.startsWith(date))) {
    return sprayWindowOutputSchema.parse({ error: "date_out_of_range" });
  }

  return sprayWindowOutputSchema.parse({
    city: forecast.city,
    date,
    timezone: forecast.timezone,
    ...sprayWindowService.assess({ hourly: forecast.hourly, date, options: { notBefore: currentLocalHour(forecast.timezone, now) } }),
  });
}

export const sprayWindowTool = tool({
  description:
    "Decide whether a field can be sprayed on a given day in a city. Applies fixed agronomic rules (wind 1–4 m/s, 10–25 °C, no rain 3 h before and after) to the hourly forecast and returns canSpray, the best window and all suitable windows in city-local time. This result is final: report it, never override it.",
  inputSchema: sprayWindowInputSchema,
  outputSchema: sprayWindowOutputSchema,
  contextSchema: clockContextSchema,
  execute: (input, { context }) => sprayWindow(input, context.now),
});
