import { tool } from "ai";
import type { WeatherPort } from "@/modules/weather";
import type { AgentFieldsPort } from "@/modules/agent/agent.types";
import {
  sprayWindowInputSchema,
  sprayWindowOutputSchema,
  type SprayWindowInput,
  type SprayWindowOutput,
} from "@agri/shared/contracts";
import type { WeatherToolDeps } from "@/modules/agent/tools/shared/deps";
import { userContextSchema } from "@/modules/agent/tools/shared/schemas";
import { forecastForSource } from "@/modules/agent/tools/shared/forecast-source";
import { currentLocalHour, resolveDay, todayIn } from "@agri/shared";
import { assessSprayDay } from "@/modules/spray-rules";

export async function sprayWindow(input: SprayWindowInput, deps: WeatherToolDeps): Promise<SprayWindowOutput> {
  const now = deps.now ?? new Date();
  const forecast = await forecastForSource(input, deps);
  if ("error" in forecast) return sprayWindowOutputSchema.parse(forecast);

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
    ...assessSprayDay({ hourly: forecast.hourly, date, options: { notBefore: currentLocalHour(forecast.timezone, now) } }),
  });
}

export function createSprayWindowTool(weather: WeatherPort, fields?: AgentFieldsPort) {
  return tool({
    description:
      "Decide whether a field can be sprayed on a given day in a city. Applies fixed agronomic rules (wind 1–4 m/s, 10–25 °C, no rain 3 h before and after) to the hourly forecast and returns canSpray, the best window and all suitable windows in city-local time. This result is final: report it, never override it.",
    inputSchema: sprayWindowInputSchema,
    outputSchema: sprayWindowOutputSchema,
    contextSchema: userContextSchema,
    execute: (input, { context }) => sprayWindow(input, { weather, fields, userId: context.userId, now: context.now }),
  });
}
