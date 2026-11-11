import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sprayOutlook } from "@/agent/tools/spray-outlook/tool";
import { sprayOutlookOutputSchema } from "@/agent/tools/spray-outlook/schemas";
import forecastLyon from "@/domain/weather/__fixtures__/forecast-lyon.json";
import geocodingEmpty from "@/domain/weather/__fixtures__/geocoding-empty.json";
import geocodingLyon from "@/domain/weather/__fixtures__/geocoding-lyon.json";
import { clearForecastCache } from "@/domain/weather/forecast";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function stubOpenMeteo(geocoding: unknown = geocodingLyon) {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => (new URL(String(input)).host.startsWith("geocoding") ? json(geocoding) : json(forecastLyon))));
}

describe("sprayOutlook", () => {
  beforeEach(() => clearForecastCache());
  afterEach(() => vi.unstubAllGlobals());

  it("returns one schema-valid entry per remaining forecast day", async () => {
    stubOpenMeteo();
    const output = await sprayOutlook({ city: "Lyon" }, new Date("2026-11-11T08:30:00Z"));
    expect(sprayOutlookOutputSchema.safeParse(output).success).toBe(true);
    if ("error" in output) throw new Error(output.error);
    expect(output.days.map((day) => day.date)).toEqual(["2026-11-11", "2026-11-12", "2026-11-13"]);
    expect(output.timezone).toBe("Europe/Paris");
  });

  it("skips days that are already in the past in the city's time zone", async () => {
    stubOpenMeteo();
    const output = await sprayOutlook({ city: "Lyon" }, new Date("2026-11-12T10:00:00Z"));
    if ("error" in output) throw new Error(output.error);
    expect(output.days.map((day) => day.date)).toEqual(["2026-11-12", "2026-11-13"]);
  });

  it("propagates city_not_found", async () => {
    stubOpenMeteo(geocodingEmpty);
    expect(await sprayOutlook({ city: "Xyzzyqwv" }, new Date("2026-11-11T08:30:00Z"))).toEqual({ error: "city_not_found" });
  });
});
