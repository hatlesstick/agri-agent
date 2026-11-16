import { vi } from "vitest";
import { scenarioFetch, type WeatherScenario } from "@tests/evals/support/weather-fixtures";

export * from "@tests/evals/support/weather-fixtures";

const originalFetch = globalThis.fetch;

export function stubWeatherScenario(scenario: WeatherScenario) {
  vi.stubGlobal("fetch", vi.fn(scenarioFetch(scenario, originalFetch)));
}
