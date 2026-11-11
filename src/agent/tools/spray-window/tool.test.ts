import { isStepCount, streamText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockChatModel } from "@/agent/mock/model";
import { MOCK_TOOL_MATCHERS } from "@/agent/mock/tool-matchers";
import { sprayWindowInputSchema, sprayWindowOutputSchema } from "@/agent/tools/spray-window/schemas";
import { sprayWindow, sprayWindowTool } from "@/agent/tools/spray-window/tool";
import { assessSprayWindows } from "@/domain/spray/rules";
import forecastLyon from "@/domain/weather/__fixtures__/forecast-lyon.json";
import geocodingEmpty from "@/domain/weather/__fixtures__/geocoding-empty.json";
import geocodingLyon from "@/domain/weather/__fixtures__/geocoding-lyon.json";
import { clearForecastCache, getForecast } from "@/domain/weather/forecast";
import { isWeatherError } from "@/domain/weather/types";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function stubOpenMeteo(geocoding: unknown = geocodingLyon) {
  const fetchMock = vi.fn(async (input: string | URL) =>
    new URL(String(input)).host.startsWith("geocoding") ? json(geocoding) : json(forecastLyon),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const MORNING_IN_PARIS = new Date("2026-11-11T08:30:00Z");

describe("sprayWindow", () => {
  beforeEach(() => clearForecastCache());
  afterEach(() => vi.unstubAllGlobals());

  it("resolves tomorrow in the city's time zone and returns the rules' assessment", async () => {
    stubOpenMeteo();
    const result = await sprayWindow({ city: "Lyon", date: "tomorrow" }, MORNING_IN_PARIS);

    const forecast = await getForecast("Lyon");
    if (isWeatherError(forecast)) throw new Error(forecast.error);
    expect(result).toEqual({
      city: "Lyon",
      date: "2026-11-12",
      timezone: "Europe/Paris",
      ...assessSprayWindows(forecast.hourly, "2026-11-12"),
    });
  });

  it("returns output that matches the output schema and carries no hourly data", async () => {
    stubOpenMeteo();
    const result = await sprayWindow({ city: "Lyon", date: "today" }, MORNING_IN_PARIS);
    expect(sprayWindowOutputSchema.safeParse(result).success).toBe(true);
    expect(result).not.toHaveProperty("hourly");
  });

  it("accepts an explicit date", async () => {
    stubOpenMeteo();
    const result = await sprayWindow({ city: "Lyon", date: "2026-11-13" }, MORNING_IN_PARIS);
    expect(result).toMatchObject({ date: "2026-11-13" });
  });

  it("returns date_out_of_range for a date outside the forecast", async () => {
    stubOpenMeteo();
    expect(await sprayWindow({ city: "Lyon", date: "2026-11-20" }, MORNING_IN_PARIS)).toEqual({
      error: "date_out_of_range",
    });
  });

  it("propagates city_not_found", async () => {
    stubOpenMeteo(geocodingEmpty);
    expect(await sprayWindow({ city: "Xyzzyqwv", date: "tomorrow" }, MORNING_IN_PARIS)).toEqual({
      error: "city_not_found",
    });
  });

  it("does not refetch the forecast for the same city", async () => {
    const fetchMock = stubOpenMeteo();
    await sprayWindow({ city: "Lyon", date: "today" }, MORNING_IN_PARIS);
    await sprayWindow({ city: "Lyon", date: "tomorrow" }, MORNING_IN_PARIS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("sprayWindowInputSchema", () => {
  it.each(["today", "tomorrow", "day_after_tomorrow", "2026-11-12"])("accepts date %s", (date) => {
    expect(sprayWindowInputSchema.safeParse({ city: "Lyon", date }).success).toBe(true);
  });

  it.each(["yesterday", "12.11.2026", "2026-11-12T10:00", ""])("rejects date %s", (date) => {
    expect(sprayWindowInputSchema.safeParse({ city: "Lyon", date }).success).toBe(false);
  });

  it("rejects a non-Latin city name", () => {
    expect(sprayWindowInputSchema.safeParse({ city: "Ліон", date: "today" }).success).toBe(false);
  });
});

describe("sprayWindowTool in a mock tool loop", () => {
  beforeEach(() => clearForecastCache());
  afterEach(() => vi.unstubAllGlobals());

  it("calls sprayWindow for a spraying question and answers from its result", async () => {
    stubOpenMeteo();
    const result = streamText({
      model: createMockChatModel({ toolMatchers: MOCK_TOOL_MATCHERS, chunkDelayInMs: null }),
      tools: { sprayWindow: sprayWindowTool },
      stopWhen: isStepCount(5),
      prompt: "Can I spray in Lyon tomorrow?",
    });

    const steps = await result.steps;
    expect(steps[0].toolCalls).toEqual([
      expect.objectContaining({ toolName: "sprayWindow", input: { city: "Lyon", date: "tomorrow" } }),
    ]);
    expect(steps[0].toolResults[0].output).toMatchObject({ city: "Lyon", timezone: "Europe/Paris" });
    expect(await result.text).toContain("[mock] sprayWindow result:");
  });
});
