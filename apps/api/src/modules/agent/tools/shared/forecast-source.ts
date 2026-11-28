import type { WeatherPort, WeatherResult } from "@/modules/weather";
import type { AgentFieldsPort } from "@/modules/agent/agent.types";

export type ForecastSourceInput = { city?: string; fieldId?: string };

export type ForecastSourceDeps = { weather: WeatherPort; fields?: AgentFieldsPort; userId?: string };

export async function forecastForSource(input: ForecastSourceInput, { weather, fields, userId }: ForecastSourceDeps): Promise<WeatherResult | { error: "field_not_found" | "not_signed_in" | "city_required" }> {
  if (input.fieldId) {
    if (!userId || !fields) return { error: "not_signed_in" as const };
    const field = await fields.getById(userId, input.fieldId);
    if (!field) return { error: "field_not_found" as const };
    return weather.getForecastAt({ name: field.name, latitude: field.lat, longitude: field.lon });
  }
  if (!input.city) return { error: "city_required" as const };
  return weather.getForecast(input.city);
}
