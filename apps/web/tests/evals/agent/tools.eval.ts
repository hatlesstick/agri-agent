import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWeather } from "@/agent/tools/get-weather/tool";
import { sprayWindowOutputSchema, type SprayWindowInput } from "@/agent/tools/spray-window/schemas";
import { sprayWindow } from "@/agent/tools/spray-window/tool";
import { sprayOutlook } from "@/agent/tools/spray-outlook/tool";
import { EVAL_NOW, UNKNOWN_CITY, stubWeatherScenario, type WeatherScenario } from "@tests/evals/scenarios";
import { printEvalReport, recordEval } from "@tests/evals/report";
import { weatherRepository } from "@/server/repositories/weather/WeatherRepository";

const SUITE = "tool evals (deterministic, no model)";

type SprayCase = {
  id: string;
  scenario: WeatherScenario;
  input: SprayWindowInput;
  expected: Record<string, unknown>;
};

const LYON_TOMORROW: SprayWindowInput = { city: "Lyon", date: "tomorrow" };

const SPRAY_CASES: SprayCase[] = [
  {
    id: "calm day: whole day is suitable",
    scenario: "calm",
    input: LYON_TOMORROW,
    expected: {
      date: "2026-11-12",
      timezone: "Europe/Paris",
      canSpray: true,
      bestWindow: { from: "2026-11-12T00:00", to: "2026-11-13T00:00", hours: 24 },
      rejectedReasons: {},
    },
  },
  {
    id: "windy day: no window, wind is the reason",
    scenario: "windy",
    input: LYON_TOMORROW,
    expected: { canSpray: false, bestWindow: null, windows: [], rejectedReasons: { wind_too_high: 24 } },
  },
  {
    id: "rain 08:00-10:00: best window after the rain buffer",
    scenario: "rainy_morning",
    input: LYON_TOMORROW,
    expected: {
      canSpray: true,
      bestWindow: { from: "2026-11-12T13:00", to: "2026-11-13T00:00", hours: 11 },
      rejectedReasons: { precipitation_nearby: 9 },
    },
  },
  {
    id: "cold day: no window, temperature is the reason",
    scenario: "cold",
    input: LYON_TOMORROW,
    expected: { canSpray: false, bestWindow: null, rejectedReasons: { too_cold: 24 } },
  },
  {
    id: "unknown city",
    scenario: "calm",
    input: { city: UNKNOWN_CITY, date: "tomorrow" },
    expected: { error: "city_not_found" },
  },
  {
    id: "date outside the forecast",
    scenario: "calm",
    input: { city: "Lyon", date: "2026-11-20" },
    expected: { error: "date_out_of_range" },
  },
];

describe(SUITE, () => {
  beforeEach(() => weatherRepository.clearCache());
  afterEach(() => vi.unstubAllGlobals());
  afterAll(() => printEvalReport(SUITE));

  it.each(SPRAY_CASES)("sprayWindow: $id", async ({ id, scenario, input, expected }) => {
    stubWeatherScenario(scenario);
    const output = await sprayWindow(input, EVAL_NOW);
    const failures: string[] = [];
    if (!sprayWindowOutputSchema.safeParse(output).success) failures.push("output schema");
    for (const [key, value] of Object.entries(expected)) {
      if (JSON.stringify((output as Record<string, unknown>)[key]) !== JSON.stringify(value)) failures.push(key);
    }
    recordEval({ suite: SUITE, case: `sprayWindow: ${id}`, model: "none", passed: failures.length ? 0 : 1, runs: 1, failures: failures.join(", ") });
    expect(failures).toEqual([]);
  });

  it("sprayOutlook: one call covers every remaining forecast day", async () => {
    stubWeatherScenario("windy");
    const output = await sprayOutlook({ city: "Lyon" }, EVAL_NOW);
    const failures: string[] = [];
    if ("error" in output) failures.push(output.error);
    else {
      const verdicts = output.days.map((day) => `${day.date}:${day.canSpray}`);
      const expected = ["2026-11-11:true", "2026-11-12:false", "2026-11-13:true"];
      if (JSON.stringify(verdicts) !== JSON.stringify(expected)) failures.push(verdicts.join(","));
    }
    recordEval({ suite: SUITE, case: "sprayOutlook: windy tomorrow only", model: "none", passed: failures.length ? 0 : 1, runs: 1, failures: failures.join(", ") });
    expect(failures).toEqual([]);
  });

  it("getWeather: 48 city-local hours starting at the current hour", async () => {
    stubWeatherScenario("calm");
    const output = await getWeather({ city: "Lyon" }, EVAL_NOW);
    const failures: string[] = [];
    if ("error" in output) failures.push(output.error);
    else {
      if (output.timezone !== "Europe/Paris") failures.push("timezone");
      if (output.hourly.length !== 48) failures.push("hours");
      if (output.hourly[0]?.time !== "2026-11-11T09:00") failures.push("first hour");
    }
    recordEval({ suite: SUITE, case: "getWeather: 48 local hours", model: "none", passed: failures.length ? 0 : 1, runs: 1, failures: failures.join(", ") });
    expect(failures).toEqual([]);
  });
});
