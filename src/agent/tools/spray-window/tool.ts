import { tool } from "ai";
import {
  sprayWindowInputSchema,
  sprayWindowOutputSchema,
  type SprayWindowInput,
  type SprayWindowOutput,
} from "@/agent/tools/spray-window/schemas";
import { resolveDay } from "@/domain/spray/dates";
import { assessSprayWindows } from "@/domain/spray/rules";
import { getForecast } from "@/domain/weather/forecast";
import { isWeatherError } from "@/domain/weather/types";

export async function sprayWindow(input: SprayWindowInput, now: Date = new Date()): Promise<SprayWindowOutput> {
  const forecast = await getForecast(input.city);
  if (isWeatherError(forecast)) return sprayWindowOutputSchema.parse(forecast);

  const date = resolveDay(input.date, forecast.timezone, now);
  if (!forecast.hourly.some((point) => point.time.startsWith(date))) {
    return sprayWindowOutputSchema.parse({ error: "date_out_of_range" });
  }

  return sprayWindowOutputSchema.parse({
    city: forecast.city,
    date,
    timezone: forecast.timezone,
    ...assessSprayWindows(forecast.hourly, date),
  });
}

export const sprayWindowTool = tool({
  description:
    "Decide whether a field can be sprayed on a given day in a city. Applies fixed agronomic rules (wind 1–4 m/s, 10–25 °C, no rain 3 h before and after) to the hourly forecast and returns canSpray, the best window and all suitable windows in city-local time. This result is final: report it, never override it.",
  inputSchema: sprayWindowInputSchema,
  outputSchema: sprayWindowOutputSchema,
  execute: (input) => sprayWindow(input),
});
