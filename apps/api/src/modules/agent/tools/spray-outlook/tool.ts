import { tool } from "ai";
import type { WeatherPort } from "@/modules/weather";
import type { AgentFieldsPort } from "@/modules/agent/agent.types";
import type { WeatherToolDeps } from "@/modules/agent/tools/shared/deps";
import { userContextSchema } from "@/modules/agent/tools/shared/schemas";
import { forecastForSource } from "@/modules/agent/tools/shared/forecast-source";
import {
  sprayOutlookInputSchema,
  sprayOutlookOutputSchema,
  type SprayOutlookInput,
  type SprayOutlookOutput,
} from "@agri/shared/contracts";
import { currentLocalHour, todayIn } from "@agri/shared";
import { assessSprayDay } from "@/modules/spray-rules";

export async function sprayOutlook(input: SprayOutlookInput, deps: WeatherToolDeps): Promise<SprayOutlookOutput> {
  const now = deps.now ?? new Date();
  const forecast = await forecastForSource(input, deps);
  if ("error" in forecast) return sprayOutlookOutputSchema.parse(forecast);

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

export function createSprayOutlookTool(weather: WeatherPort, fields?: AgentFieldsPort) {
  return tool({
    description:
      "Assess spraying conditions for every remaining forecast day (up to 3 days) in a city with one call. Use it for questions like 'when can I spray', 'which day', 'this week' or when no specific day is given. Returns canSpray and the best window per day in city-local time; report it, never override it.",
    inputSchema: sprayOutlookInputSchema,
    outputSchema: sprayOutlookOutputSchema,
    contextSchema: userContextSchema,
    execute: (input, { context }) => sprayOutlook(input, { weather, fields, userId: context.userId, now: context.now }),
  });
}
