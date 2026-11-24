import { describe, expect, it } from "vitest";
import { buildHourStrip } from "@/ui/helpers/hour-strip";

const date = "2026-11-12";
const hourly = [
  { time: "2026-11-12T06:00", windSpeed: 1.2, precipitation: 0 },
  { time: "2026-11-12T08:00", windSpeed: 2.5, precipitation: 0 },
  { time: "2026-11-12T09:00", windSpeed: 3.1, precipitation: 0.2 },
];

describe("buildHourStrip", () => {
  it("returns the 17 hours from 05:00 to 21:00", () => {
    const hours = buildHourStrip({ date, windows: [], hourly: [] });
    expect(hours).toHaveLength(17);
    expect(hours[0].time).toBe("05:00");
    expect(hours[16].time).toBe("21:00");
  });

  it("marks hours inside a spray window as go and the rest as stop", () => {
    const hours = buildHourStrip({ date, windows: [{ from: "2026-11-12T08:00", to: "2026-11-12T09:00" }], hourly });
    expect(hours.find((hour) => hour.time === "08:00")?.status).toBe("go");
    expect(hours.find((hour) => hour.time === "09:00")?.status).toBe("go");
    expect(hours.find((hour) => hour.time === "06:00")?.status).toBe("stop");
  });

  it("joins wind and precipitation from the weather hours by time", () => {
    const hours = buildHourStrip({ date, windows: [], hourly });
    expect(hours.find((hour) => hour.time === "09:00")).toMatchObject({ windMs: 3.1, precipMm: 0.2 });
  });

  it("leaves values empty for hours without weather data", () => {
    const hours = buildHourStrip({ date, windows: [], hourly: [] });
    expect(hours[0]).toMatchObject({ windMs: null, precipMm: null, status: "stop" });
  });
});
