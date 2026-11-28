import { describe, expect, it } from "vitest";
import { sprayOutlook } from "@/modules/agent/tools/spray-outlook/tool";
import { sprayWindow } from "@/modules/agent/tools/spray-window/tool";
import type { AgentFieldsPort } from "@/modules/agent/agent.types";
import type { Field } from "@/modules/fields";
import { fakeWeather } from "@tests/support/fake-ports";

const USER = "11111111-1111-4111-8111-111111111111";
const FIELD_ID = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-11-28T10:00:00Z");

const wheat = { id: FIELD_ID, userId: USER, name: "Wheat near Lyon", crop: "wheat", lat: 45.76, lon: 4.84, areaHa: "12.50", notes: null } as Field;

function fields(): AgentFieldsPort {
  return {
    list: async () => [wheat],
    getById: async (_user, id) => (id === FIELD_ID ? wheat : null),
  };
}

describe("spray tools for a saved field", () => {
  it("sprayWindow with a fieldId asks the forecast for the field's coordinates, not a city", async () => {
    const weather = fakeWeather({ error: "weather_unavailable" });
    const output = await sprayWindow({ fieldId: FIELD_ID, date: "tomorrow" }, { weather, fields: fields(), userId: USER, now: NOW });
    expect(output).toEqual({ error: "weather_unavailable" });
    expect(weather.placeCalls).toEqual([{ name: "Wheat near Lyon", latitude: 45.76, longitude: 4.84 }]);
    expect(weather.calls).toEqual([]);
  });

  it("sprayOutlook with a fieldId asks the forecast for the field's coordinates", async () => {
    const weather = fakeWeather({ error: "weather_unavailable" });
    await sprayOutlook({ fieldId: FIELD_ID }, { weather, fields: fields(), userId: USER, now: NOW });
    expect(weather.placeCalls).toEqual([{ name: "Wheat near Lyon", latitude: 45.76, longitude: 4.84 }]);
  });

  it("with neither a city nor a field the tool asks for a city", async () => {
    const weather = fakeWeather({ error: "weather_unavailable" });
    expect(await sprayWindow({ date: "tomorrow" }, { weather, now: NOW })).toEqual({ error: "city_required" });
    expect(await sprayOutlook({}, { weather, now: NOW })).toEqual({ error: "city_required" });
    expect(weather.calls).toEqual([]);
    expect(weather.placeCalls).toEqual([]);
  });

  it("an unknown or foreign field is field_not_found and no forecast is fetched", async () => {
    const weather = fakeWeather({ error: "weather_unavailable" });
    const output = await sprayWindow({ fieldId: "44444444-4444-4444-8444-444444444444", date: "tomorrow" }, { weather, fields: fields(), userId: USER, now: NOW });
    expect(output).toEqual({ error: "field_not_found" });
    expect(weather.placeCalls).toEqual([]);
  });

  it("a fieldId without a signed-in user is not_signed_in", async () => {
    const weather = fakeWeather({ error: "weather_unavailable" });
    expect(await sprayWindow({ fieldId: FIELD_ID, date: "tomorrow" }, { weather, fields: fields(), now: NOW })).toEqual({ error: "not_signed_in" });
    expect(weather.placeCalls).toEqual([]);
  });
});
