import { vi } from "vitest";
import forecastLyon from "@tests/fixtures/weather/forecast-lyon.json";
import { currentLocalHour } from "@/shared/helpers/time";

export const EVAL_NOW = new Date("2026-11-11T08:30:00Z");
export const EVAL_TOMORROW = "2026-11-12";
export const UNKNOWN_CITY = "Xyzzyqwv";

type EvalCity = { name: string; country: string; admin1: string; latitude: number; longitude: number; timezone: string };

const EVAL_CITIES: EvalCity[] = [
  { name: "Lyon", country: "France", admin1: "Auvergne-Rhône-Alpes", latitude: 45.74906, longitude: 4.84789, timezone: "Europe/Paris" },
  { name: "Munich", country: "Germany", admin1: "Bavaria", latitude: 48.13743, longitude: 11.57549, timezone: "Europe/Berlin" },
];

function cityByName(name: string | null): EvalCity | undefined {
  return EVAL_CITIES.find((city) => city.name.toLowerCase() === name?.trim().toLowerCase());
}

function cityByLatitude(latitude: string | null): EvalCity | undefined {
  return EVAL_CITIES.find((city) => String(city.latitude) === latitude);
}

function geocodingResponse(city: EvalCity | undefined) {
  return city ? { results: [{ ...city }] } : {};
}

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

export function scenarioForecast(scenario: WeatherScenario, timezone = "Europe/Paris") {
  const times = forecastLyon.hourly.time;
  const values = times.map((unixSeconds) => valuesAt(scenario, currentLocalHour(timezone, new Date(unixSeconds * 1000))));
  return {
    ...forecastLyon,
    timezone,
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
        return json(geocodingResponse(cityByName(url.searchParams.get("name"))));
      }
      if (url.host === "api.open-meteo.com") {
        const city = cityByLatitude(url.searchParams.get("latitude"));
        return city ? json(scenarioForecast(scenario, city.timezone)) : new Response("unknown location", { status: 400 });
      }
      return originalFetch(input, init);
    }),
  );
}
