import { vi } from "vitest";
import forecastLyon from "@/domain/weather/__fixtures__/forecast-lyon.json";
import geocodingEmpty from "@/domain/weather/__fixtures__/geocoding-empty.json";
import geocodingLyon from "@/domain/weather/__fixtures__/geocoding-lyon.json";

export const EVAL_NOW = new Date("2026-11-11T08:30:00Z");
export const EVAL_TOMORROW = "2026-11-12";
export const UNKNOWN_CITY = "Xyzzyqwv";

export type WeatherScenario = "calm" | "windy" | "rainy_morning" | "cold";

type HourlyValues = { temperature: number; wind: number; precipitation: number };

const CALM: HourlyValues = { temperature: 15, wind: 2, precipitation: 0 };

function valuesAt(scenario: WeatherScenario, time: string): HourlyValues {
  const isTomorrow = time.startsWith(EVAL_TOMORROW);
  if (!isTomorrow) return CALM;
  const hour = Number(time.slice(11, 13));
  switch (scenario) {
    case "windy":
      return { ...CALM, wind: 7 };
    case "cold":
      return { ...CALM, temperature: 5 };
    case "rainy_morning":
      return hour >= 8 && hour <= 10 ? { ...CALM, precipitation: 2 } : CALM;
    case "calm":
      return CALM;
  }
}

export function scenarioForecast(scenario: WeatherScenario) {
  const times = forecastLyon.hourly.time;
  const values = times.map((time) => valuesAt(scenario, time));
  return {
    ...forecastLyon,
    hourly: {
      time: times,
      temperature_2m: values.map((value) => value.temperature),
      wind_speed_10m: values.map((value) => value.wind),
      precipitation: values.map((value) => value.precipitation),
      precipitation_probability: values.map((value) => (value.precipitation > 0 ? 90 : 0)),
      relative_humidity_2m: values.map(() => 70),
    },
  };
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

const originalFetch = globalThis.fetch;

export function stubWeatherScenario(scenario: WeatherScenario) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.host.startsWith("geocoding")) {
        return json(url.searchParams.get("name") === UNKNOWN_CITY ? geocodingEmpty : geocodingLyon);
      }
      if (url.host === "api.open-meteo.com") return json(scenarioForecast(scenario));
      return originalFetch(input, init);
    }),
  );
}
