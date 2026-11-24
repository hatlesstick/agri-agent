import { describe, expect, it } from "vitest";
import { buildForecast, parseStoredForecast } from "@/ui/helpers/forecast-memory";

const sprayWindow = (city: string, date: string, from: string, to: string) => ({
  type: "tool-sprayWindow",
  state: "output-available",
  output: { city, date, timezone: "Europe/Kyiv", canSpray: true, bestWindow: { from, to, hours: 2 }, windows: [{ from, to, hours: 2 }], rejectedReasons: {} },
});

const getWeather = (city: string) => ({
  type: "tool-getWeather",
  state: "output-available",
  output: {
    city,
    country: "Ukraine",
    region: null,
    latitude: 50.7,
    longitude: 25.3,
    timezone: "Europe/Kyiv",
    hourly: [
      { time: "2026-11-12T08:00", temperature: 5, windSpeed: 2.5, precipitation: 0, precipitationProbability: 0, humidity: 70 },
      { time: "2026-11-12T09:00", temperature: 6, windSpeed: 3.1, precipitation: 0.2, precipitationProbability: 10, humidity: 68 },
    ],
  },
});

const message = (parts: unknown[]) => ({ id: "m", role: "assistant", parts }) as never;

describe("buildForecast", () => {
  it("combines the latest spray window with the weather hours of the same city", () => {
    const forecast = buildForecast([
      message([sprayWindow("Луцьк", "2026-11-12", "2026-11-12T08:00", "2026-11-12T09:00"), getWeather("Луцьк")]),
    ]);
    expect(forecast).toMatchObject({ city: "Луцьк", date: "2026-11-12", windows: [{ from: "2026-11-12T08:00", to: "2026-11-12T09:00" }] });
    expect(forecast?.hourly).toHaveLength(2);
  });

  it("prefers the most recent answer and ignores failed tool calls", () => {
    const forecast = buildForecast([
      message([sprayWindow("Львів", "2026-11-11", "2026-11-11T07:00", "2026-11-11T08:00")]),
      message([{ type: "tool-sprayWindow", state: "output-error", errorText: "boom" }]),
      message([sprayWindow("Луцьк", "2026-11-12", "2026-11-12T08:00", "2026-11-12T09:00"), getWeather("Луцьк")]),
    ]);
    expect(forecast?.city).toBe("Луцьк");
  });

  it("returns nothing when there is no spray window answer", () => {
    expect(buildForecast([message([getWeather("Луцьк")])])).toBeNull();
    expect(buildForecast([])).toBeNull();
  });

  it("keeps the spray window with empty weather when the city has no weather hours", () => {
    const forecast = buildForecast([message([sprayWindow("Київ", "2026-11-12", "2026-11-12T08:00", "2026-11-12T09:00")])]);
    expect(forecast?.hourly).toEqual([]);
  });
});

describe("parseStoredForecast", () => {
  it("reads a stored forecast and rejects anything else", () => {
    const raw = JSON.stringify({ city: "Луцьк", date: "2026-11-12", windows: [], hourly: [] });
    expect(parseStoredForecast(raw)).toMatchObject({ city: "Луцьк" });
    expect(parseStoredForecast("not json")).toBeNull();
    expect(parseStoredForecast(JSON.stringify({ city: 1 }))).toBeNull();
    expect(parseStoredForecast(null)).toBeNull();
  });
});
