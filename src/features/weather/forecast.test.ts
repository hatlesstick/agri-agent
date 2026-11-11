import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import forecastLyon from "@/features/weather/__fixtures__/forecast-lyon.json";
import geocodingEmpty from "@/features/weather/__fixtures__/geocoding-empty.json";
import geocodingLyon from "@/features/weather/__fixtures__/geocoding-lyon.json";
import {
  clearForecastCache,
  FORECAST_CACHE_MAX_ENTRIES,
  forecastCacheSize,
  getForecast,
} from "@/features/weather/forecast";
import { isWeatherError, type Forecast } from "@/features/weather/types";

type FetchHandler = (url: URL) => Response | Promise<Response>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function stubFetch({
  geocoding = () => json(geocodingLyon),
  forecast = () => json(forecastLyon),
}: { geocoding?: FetchHandler; forecast?: FetchHandler } = {}) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    void init;
    const url = new URL(input instanceof Request ? input.url : input);
    return url.host.startsWith("geocoding") ? geocoding(url) : forecast(url);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof stubFetch>, host: string): URL {
  const call = fetchMock.mock.calls.find(([input]) => new URL(String(input)).host.startsWith(host));
  if (!call) throw new Error(`no request to ${host}`);
  return new URL(String(call[0]));
}

function asForecast(result: Awaited<ReturnType<typeof getForecast>>): Forecast {
  if (isWeatherError(result)) throw new Error(`unexpected error ${result.error}`);
  return result;
}

describe("getForecast", () => {
  beforeEach(() => clearForecastCache());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns a compact forecast for Lyon", async () => {
    stubFetch();
    const forecast = asForecast(await getForecast("Lyon"));
    expect(forecast).toMatchObject({
      city: "Lyon",
      country: "France",
      region: "Auvergne-Rhône-Alpes",
      timezone: "Europe/Paris",
    });
    expect(forecast.hourly).toHaveLength(72);
    expect(forecast.hourly[0]).toEqual({
      time: "2026-11-11T00:00",
      temperature: 15.9,
      windSpeed: 1.5,
      precipitation: 0,
      precipitationProbability: 3,
      humidity: 89,
    });
  });

  it("keeps missing hourly values as null", async () => {
    stubFetch();
    const forecast = asForecast(await getForecast("Lyon"));
    expect(forecast.hourly[10].windSpeed).toBeNull();
    expect(forecast.hourly[11].windSpeed).toBeNull();
    expect(forecast.hourly[12].windSpeed).toEqual(expect.any(Number));
  });

  it("returns city_not_found when geocoding has no results", async () => {
    stubFetch({ geocoding: () => json(geocodingEmpty) });
    expect(await getForecast("Xyzzyqwv")).toEqual({ error: "city_not_found" });
  });

  it("returns city_not_found for a blank name without calling the API", async () => {
    const fetchMock = stubFetch();
    expect(await getForecast("   ")).toEqual({ error: "city_not_found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns weather_unavailable on a 5xx from the forecast API", async () => {
    stubFetch({ forecast: () => json({ error: true }, 503) });
    expect(await getForecast("Lyon")).toEqual({ error: "weather_unavailable" });
  });

  it("returns weather_unavailable on a 5xx from the geocoding API", async () => {
    stubFetch({ geocoding: () => json({ error: true }, 500) });
    expect(await getForecast("Lyon")).toEqual({ error: "weather_unavailable" });
  });

  it("returns weather_unavailable when fetch rejects", async () => {
    stubFetch({ forecast: () => Promise.reject(new TypeError("fetch failed")) });
    expect(await getForecast("Lyon")).toEqual({ error: "weather_unavailable" });
  });

  it("returns weather_unavailable on a non-JSON body", async () => {
    stubFetch({ forecast: () => new Response("<html>oops</html>", { status: 200 }) });
    expect(await getForecast("Lyon")).toEqual({ error: "weather_unavailable" });
  });

  it("returns weather_unavailable when the response shape is unexpected", async () => {
    stubFetch({ forecast: () => json({ hourly: { time: "not-an-array" } }) });
    expect(await getForecast("Lyon")).toEqual({ error: "weather_unavailable" });
  });

  it("returns weather_unavailable when the request times out", async () => {
    stubFetch({ forecast: () => Promise.reject(new DOMException("timed out", "TimeoutError")) });
    expect(await getForecast("Lyon")).toEqual({ error: "weather_unavailable" });
  });

  it("passes an abort signal to every request", async () => {
    const fetchMock = stubFetch();
    await getForecast("Lyon");
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("sends an encoded geocoding request with language=en and count=1", async () => {
    const fetchMock = stubFetch();
    await getForecast("Lyon");
    const url = requestedUrl(fetchMock, "geocoding");
    expect(url.searchParams.get("name")).toBe("Lyon");
    expect(url.searchParams.get("count")).toBe("1");
    expect(url.searchParams.get("language")).toBe("en");
  });

  it("sends the forecast request with the agreed parameters", async () => {
    const fetchMock = stubFetch();
    await getForecast("Lyon");
    const url = requestedUrl(fetchMock, "api");
    expect(url.searchParams.get("latitude")).toBe("45.74906");
    expect(url.searchParams.get("longitude")).toBe("4.84789");
    expect(url.searchParams.get("wind_speed_unit")).toBe("ms");
    expect(url.searchParams.get("timezone")).toBe("auto");
    expect(url.searchParams.get("forecast_days")).toBe("3");
    expect(url.searchParams.get("hourly")?.split(",").sort()).toEqual(
      ["precipitation", "precipitation_probability", "relative_humidity_2m", "temperature_2m", "wind_speed_10m"],
    );
  });

  it("uses the URLs from the environment", async () => {
    vi.stubEnv("OPEN_METEO_GEOCODING_URL", "https://geo.example.com/v1/search");
    vi.stubEnv("OPEN_METEO_FORECAST_URL", "https://forecast.example.com/v1/forecast");
    const fetchMock = vi.fn(async (input: string | URL) =>
      new URL(String(input)).host === "geo.example.com" ? json(geocodingLyon) : json(forecastLyon),
    );
    vi.stubGlobal("fetch", fetchMock);
    asForecast(await getForecast("Lyon"));
    expect(fetchMock.mock.calls.map(([input]) => new URL(String(input)).host)).toEqual([
      "geo.example.com",
      "forecast.example.com",
    ]);
    vi.unstubAllEnvs();
  });

  it("serves a differently spaced and cased name from cache", async () => {
    const fetchMock = stubFetch();
    await getForecast("Lyon");
    await getForecast(" lyon ");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refetches after the cache entry expires", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const fetchMock = stubFetch();
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z"));
    await getForecast("Lyon");
    vi.setSystemTime(new Date("2026-11-11T10:16:00Z"));
    await getForecast("Lyon");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("evicts the oldest entry when the cache is full", async () => {
    const fetchMock = stubFetch();
    for (let index = 0; index < FORECAST_CACHE_MAX_ENTRIES; index += 1) {
      await getForecast(`Lyon${index}`);
    }
    expect(forecastCacheSize()).toBe(FORECAST_CACHE_MAX_ENTRIES);

    await getForecast("Overflow");
    expect(forecastCacheSize()).toBe(FORECAST_CACHE_MAX_ENTRIES);

    const callsBefore = fetchMock.mock.calls.length;
    await getForecast("Lyon0");
    expect(fetchMock.mock.calls.length).toBe(callsBefore + 2);
  });

  it("keeps a recently used entry when evicting", async () => {
    const fetchMock = stubFetch();
    for (let index = 0; index < FORECAST_CACHE_MAX_ENTRIES; index += 1) {
      await getForecast(`Lyon${index}`);
    }
    await getForecast("Lyon0");
    await getForecast("Overflow");

    const callsBefore = fetchMock.mock.calls.length;
    await getForecast("Lyon0");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it("drops an expired entry when it is read", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    stubFetch();
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z"));
    await getForecast("Lyon");
    vi.setSystemTime(new Date("2026-11-11T10:16:00Z"));
    stubFetch({ forecast: () => json({}, 503) });
    await getForecast("Lyon");
    expect(forecastCacheSize()).toBe(0);
  });

  it("does not cache failures", async () => {
    const fetchMock = stubFetch({ forecast: () => json({}, 503) });
    await getForecast("Lyon");
    stubFetch();
    asForecast(await getForecast("Lyon"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
