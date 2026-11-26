import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenMeteoClient, WeatherRepository } from "@/modules/weather";
import { sprayOutlook } from "@/modules/agent/tools/spray-outlook/tool";
import { sprayOutlookOutputSchema } from "@agri/shared/contracts";
import forecastLyon from "@tests/fixtures/weather/forecast-lyon.json";
import geocodingEmpty from "@tests/fixtures/weather/geocoding-empty.json";
import geocodingLyon from "@tests/fixtures/weather/geocoding-lyon.json";
import { fakeWeather } from "@tests/support/fake-ports";

const weatherRepository = new WeatherRepository(new OpenMeteoClient());


const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function stubOpenMeteo(geocoding: unknown = geocodingLyon) {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => (new URL(String(input)).host.startsWith("geocoding") ? json(geocoding) : json(forecastLyon))));
}

describe("sprayOutlook", () => {
  beforeEach(() => weatherRepository.clearCache());
  afterEach(() => vi.unstubAllGlobals());

  it("returns one schema-valid entry per remaining forecast day", async () => {
    stubOpenMeteo();
    const output = await sprayOutlook({ city: "Lyon" }, { weather: weatherRepository, now: new Date("2026-11-11T08:30:00Z") });
    expect(sprayOutlookOutputSchema.safeParse(output).success).toBe(true);
    if ("error" in output) throw new Error(output.error);
    expect(output.days.map((day) => day.date)).toEqual(["2026-11-11", "2026-11-12", "2026-11-13"]);
    expect(output.timezone).toBe("Europe/Paris");
  });

  it("skips days that are already in the past in the city's time zone", async () => {
    stubOpenMeteo();
    const output = await sprayOutlook({ city: "Lyon" }, { weather: weatherRepository, now: new Date("2026-11-12T10:00:00Z") });
    if ("error" in output) throw new Error(output.error);
    expect(output.days.map((day) => day.date)).toEqual(["2026-11-12", "2026-11-13"]);
  });

  it("ignores hours that have already passed on the first day", async () => {
    stubOpenMeteo();
    const output = await sprayOutlook({ city: "Lyon" }, { weather: weatherRepository, now: new Date("2026-11-11T18:30:00Z") });
    if ("error" in output) throw new Error(output.error);
    const today = output.days[0];
    expect(today.date).toBe("2026-11-11");
    if (today.bestWindow) expect(today.bestWindow.from >= "2026-11-11T19:00").toBe(true);
    const hoursLeftToday = 5;
    const reasonsPerHourAtMost = 4;
    expect(Object.values(today.rejectedReasons).reduce((total, count) => total + (count ?? 0), 0)).toBeLessThanOrEqual(hoursLeftToday * reasonsPerHourAtMost);
  });

  it("propagates city_not_found", async () => {
    stubOpenMeteo(geocodingEmpty);
    expect(await sprayOutlook({ city: "Xyzzyqwv" }, { weather: weatherRepository, now: new Date("2026-11-11T08:30:00Z") })).toEqual({ error: "city_not_found" });
  });
});

describe("injected weather port", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the forecast from the injected weather port", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("fetch must not be called");
    }));
    const weather = fakeWeather({ error: "city_not_found" });
    expect(await sprayOutlook({ city: "Atlantis" }, { weather, now: new Date("2026-11-11T08:30:00Z") })).toEqual({ error: "city_not_found" });
    expect(weather.calls).toEqual(["Atlantis"]);
  });
});
