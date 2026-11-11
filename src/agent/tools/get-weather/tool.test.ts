import { isStepCount, streamText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockChatModel } from "@/agent/mock/model";
import { MOCK_TOOL_MATCHERS } from "@/agent/mock/tool-matchers";
import { getWeatherInputSchema, getWeatherOutputSchema } from "@/agent/tools/get-weather/schemas";
import { getWeather, getWeatherTool, WEATHER_HOURS_FOR_MODEL } from "@/agent/tools/get-weather/tool";
import forecastLyon from "@/domain/weather/__fixtures__/forecast-lyon.json";
import geocodingEmpty from "@/domain/weather/__fixtures__/geocoding-empty.json";
import geocodingLyon from "@/domain/weather/__fixtures__/geocoding-lyon.json";
import { clearForecastCache } from "@/domain/weather/forecast";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function stubOpenMeteo(geocoding: unknown = geocodingLyon) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) =>
      new URL(String(input)).host.startsWith("geocoding") ? json(geocoding) : json(forecastLyon),
    ),
  );
}

const NOW_PARIS_09_30 = new Date("2026-11-11T08:30:00Z");

describe("getWeather", () => {
  beforeEach(() => clearForecastCache());
  afterEach(() => vi.unstubAllGlobals());

  it("returns at most 48 hours starting at the current local hour", async () => {
    stubOpenMeteo();
    const result = await getWeather({ city: "Lyon" }, NOW_PARIS_09_30);
    if ("error" in result) throw new Error(result.error);
    expect(result.hourly).toHaveLength(WEATHER_HOURS_FOR_MODEL);
    expect(result.hourly[0].time).toBe("2026-11-11T09:00");
    expect(result.hourly.at(-1)?.time).toBe("2026-11-13T08:00");
  });

  it("returns fewer hours near the end of the forecast", async () => {
    stubOpenMeteo();
    const result = await getWeather({ city: "Lyon" }, new Date("2026-11-13T21:10:00Z"));
    if ("error" in result) throw new Error(result.error);
    expect(result.hourly.map((point) => point.time)).toEqual(["2026-11-13T22:00", "2026-11-13T23:00"]);
  });

  it("rounds numbers to one decimal and keeps nulls", async () => {
    stubOpenMeteo();
    const result = await getWeather({ city: "Lyon" }, NOW_PARIS_09_30);
    if ("error" in result) throw new Error(result.error);
    expect(result.hourly[1].windSpeed).toBeNull();
    const numbers = result.hourly.flatMap((point) =>
      [point.temperature, point.windSpeed, point.precipitation, point.humidity].filter((value) => value !== null),
    );
    for (const value of numbers) expect(Math.round(value * 10) / 10).toBe(value);
  });

  it("returns output that matches the output schema", async () => {
    stubOpenMeteo();
    const result = await getWeather({ city: "Lyon" }, NOW_PARIS_09_30);
    expect(getWeatherOutputSchema.safeParse(result).success).toBe(true);
  });

  it("passes errors through unchanged", async () => {
    stubOpenMeteo(geocodingEmpty);
    expect(await getWeather({ city: "Xyzzyqwv" }, NOW_PARIS_09_30)).toEqual({ error: "city_not_found" });
  });
});

describe("getWeatherTool in a mock tool loop", () => {
  beforeEach(() => clearForecastCache());
  afterEach(() => vi.unstubAllGlobals());

  it("calls getWeather with the city from the question and answers from its result", async () => {
    stubOpenMeteo();
    const result = streamText({
      model: createMockChatModel({ toolMatchers: MOCK_TOOL_MATCHERS, chunkDelayInMs: null }),
      tools: { getWeather: getWeatherTool },
      stopWhen: isStepCount(3),
      prompt: "What is the weather in Lyon tomorrow?",
    });

    const steps = await result.steps;
    expect(steps[0].toolCalls).toEqual([expect.objectContaining({ toolName: "getWeather", input: { city: "Lyon" } })]);
    expect(steps[0].toolResults[0].output).toMatchObject({ city: "Lyon", timezone: "Europe/Paris" });
    expect(await result.text).toContain("[mock] getWeather result:");
  });

  it("accepts Latin city names with diacritics, spaces and hyphens", () => {
    for (const city of ["Kraków", "Saint-Étienne", "Den Haag", "Clermont-Ferrand"]) {
      expect(getWeatherInputSchema.safeParse({ city }).success).toBe(true);
    }
  });

  it("rejects input that does not match the input schema", () => {
    expect(getWeatherInputSchema.safeParse({ city: "" }).success).toBe(false);
    expect(getWeatherInputSchema.safeParse({ city: "   " }).success).toBe(false);
    expect(getWeatherInputSchema.safeParse({ city: "a".repeat(101) }).success).toBe(false);
    expect(getWeatherInputSchema.safeParse({ city: "\u041b\u0456\u043e\u043d" }).success).toBe(false);
    expect(getWeatherInputSchema.safeParse({}).success).toBe(false);
  });
});
