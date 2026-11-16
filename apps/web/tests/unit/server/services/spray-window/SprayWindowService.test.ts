import { describe, expect, it } from "vitest";
import { sprayWindowService } from "@/server/services/spray-window/SprayWindowService";
import type { AssessmentOptions, SprayAssessment, SprayThresholds } from "@/server/services/spray-window/SprayWindowService.types";
import type { HourlyPoint } from "@/server/repositories/weather/weather.types";

const DAYS = ["2026-11-11", "2026-11-12", "2026-11-13"];
const MIDDLE_DAY = DAYS[1];

function hourIso(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00`;
}

function calmHour(time: string): HourlyPoint {
  return { time, temperature: 15, windSpeed: 2, precipitation: 0, precipitationProbability: 0, humidity: 70 };
}

function makeHours(overrides: Record<string, Partial<HourlyPoint>> = {}): HourlyPoint[] {
  return DAYS.flatMap((date) =>
    Array.from({ length: 24 }, (_, hour) => {
      const time = hourIso(date, hour);
      return { ...calmHour(time), ...overrides[time] };
    }),
  );
}

function windowsOf(assessment: SprayAssessment) {
  return assessment.windows.map(({ from, to }) => `${from}–${to}`);
}

function isSuitable(assessment: SprayAssessment, time: string): boolean {
  return assessment.windows.some((window) => window.from <= time && time < window.to);
}

const assessSprayWindows = (hourly: HourlyPoint[], date: string, thresholds: Partial<SprayThresholds> = {}, options: AssessmentOptions = {}) =>
  sprayWindowService.assess({ hourly, date, thresholds, options });

describe("SprayWindowService.assess", () => {
  it("all-calm middle day yields one 24 h window from T00:00 to next day T00:00", () => {
    const assessment = assessSprayWindows(makeHours(), MIDDLE_DAY);
    expect(assessment.windows).toEqual([{ from: "2026-11-12T00:00", to: "2026-11-13T00:00", hours: 24 }]);
    expect(assessment.canSpray).toBe(true);
    expect(assessment.bestWindow).toEqual(assessment.windows[0]);
    expect(assessment.rejectedReasons).toEqual({});
  });

  it("first forecast day starts its window at T02:00 because earlier hours lack 3 h of look-back", () => {
    const assessment = assessSprayWindows(makeHours(), DAYS[0]);
    expect(windowsOf(assessment)).toEqual(["2026-11-11T02:00–2026-11-12T00:00"]);
    expect(assessment.rejectedReasons).toEqual({ insufficient_data: 2 });
  });

  it("last 4 hours of the forecast are insufficient_data (spraying hour plus 3 h after)", () => {
    const assessment = assessSprayWindows(makeHours(), DAYS[2]);
    expect(windowsOf(assessment)).toEqual(["2026-11-13T00:00–2026-11-13T20:00"]);
    expect(assessment.rejectedReasons).toEqual({ insufficient_data: 4 });
  });

  it("wind exactly 4 is suitable, 4.1 is wind_too_high", () => {
    const assessment = assessSprayWindows(
      makeHours({ "2026-11-12T10:00": { windSpeed: 4 }, "2026-11-12T11:00": { windSpeed: 4.1 } }),
      MIDDLE_DAY,
    );
    expect(isSuitable(assessment, "2026-11-12T10:00")).toBe(true);
    expect(isSuitable(assessment, "2026-11-12T11:00")).toBe(false);
    expect(assessment.rejectedReasons).toEqual({ wind_too_high: 1 });
  });

  it("wind exactly 1 is suitable, 0.9 is wind_too_low", () => {
    const assessment = assessSprayWindows(
      makeHours({ "2026-11-12T10:00": { windSpeed: 1 }, "2026-11-12T11:00": { windSpeed: 0.9 } }),
      MIDDLE_DAY,
    );
    expect(isSuitable(assessment, "2026-11-12T10:00")).toBe(true);
    expect(assessment.rejectedReasons).toEqual({ wind_too_low: 1 });
  });

  it("temperature exactly 10 and 25 are suitable, 9.9 too_cold, 25.1 too_hot", () => {
    const assessment = assessSprayWindows(
      makeHours({
        "2026-11-12T06:00": { temperature: 10 },
        "2026-11-12T07:00": { temperature: 9.9 },
        "2026-11-12T14:00": { temperature: 25 },
        "2026-11-12T15:00": { temperature: 25.1 },
      }),
      MIDDLE_DAY,
    );
    expect(isSuitable(assessment, "2026-11-12T06:00")).toBe(true);
    expect(isSuitable(assessment, "2026-11-12T14:00")).toBe(true);
    expect(assessment.rejectedReasons).toEqual({ too_cold: 1, too_hot: 1 });
  });

  it("rain 0.1 mm in the hour ending 12:00 rejects spraying hours 08:00–14:00", () => {
    const assessment = assessSprayWindows(makeHours({ "2026-11-12T12:00": { precipitation: 0.1 } }), MIDDLE_DAY);
    expect(windowsOf(assessment)).toEqual([
      "2026-11-12T00:00–2026-11-12T08:00",
      "2026-11-12T15:00–2026-11-13T00:00",
    ]);
    expect(assessment.rejectedReasons).toEqual({ precipitation_nearby: 7 });
  });

  it("rain ending 3 h after the spraying hour ends still rejects it", () => {
    const assessment = assessSprayWindows(makeHours({ "2026-11-12T14:00": { precipitation: 1 } }), MIDDLE_DAY);
    expect(isSuitable(assessment, "2026-11-12T10:00")).toBe(false);
    expect(isSuitable(assessment, "2026-11-12T09:00")).toBe(true);
  });

  it("skips hours before notBefore without counting them as rejected", () => {
    const assessment = assessSprayWindows(makeHours({ "2026-11-12T03:00": { windSpeed: 9 } }), MIDDLE_DAY, {}, { notBefore: "2026-11-12T19:00" });
    expect(windowsOf(assessment)).toEqual(["2026-11-12T19:00–2026-11-13T00:00"]);
    expect(assessment.rejectedReasons).toEqual({});
  });

  it("has no window for a day whose remaining hours are all past", () => {
    const assessment = assessSprayWindows(makeHours(), MIDDLE_DAY, {}, { notBefore: "2026-11-13T00:00" });
    expect(assessment).toEqual({ canSpray: false, bestWindow: null, windows: [], rejectedReasons: {} });
  });

  it("rain below the threshold does not count", () => {
    const assessment = assessSprayWindows(makeHours({ "2026-11-12T12:00": { precipitation: 0.09 } }), MIDDLE_DAY);
    expect(assessment.windows).toHaveLength(1);
  });

  it("rain just outside the 3 h buffers does not reject the hour", () => {
    const assessment = assessSprayWindows(makeHours({ "2026-11-12T12:00": { precipitation: 2 } }), MIDDLE_DAY);
    expect(isSuitable(assessment, "2026-11-12T07:00")).toBe(true);
    expect(isSuitable(assessment, "2026-11-12T15:00")).toBe(true);
  });

  it("null wind at 10:00 makes 10:00 insufficient_data", () => {
    const assessment = assessSprayWindows(makeHours({ "2026-11-12T10:00": { windSpeed: null } }), MIDDLE_DAY);
    expect(isSuitable(assessment, "2026-11-12T10:00")).toBe(false);
    expect(assessment.rejectedReasons).toEqual({ insufficient_data: 1 });
  });

  it("null precipitation makes every hour within reach insufficient_data", () => {
    const assessment = assessSprayWindows(makeHours({ "2026-11-12T12:00": { precipitation: null } }), MIDDLE_DAY);
    expect(assessment.rejectedReasons).toEqual({ insufficient_data: 7 });
  });

  it("minHumidity 50 rejects humidity 49 as humidity_too_low; null disables the check", () => {
    const hours = makeHours({ "2026-11-12T10:00": { humidity: 49 }, "2026-11-12T11:00": { humidity: 50 } });
    const withCheck = assessSprayWindows(hours, MIDDLE_DAY, { minHumidity: 50 });
    expect(withCheck.rejectedReasons).toEqual({ humidity_too_low: 1 });
    expect(isSuitable(withCheck, "2026-11-12T11:00")).toBe(true);
    expect(assessSprayWindows(hours, MIDDLE_DAY).rejectedReasons).toEqual({});
  });

  it("counts every reason of an hour that fails several rules", () => {
    const assessment = assessSprayWindows(
      makeHours({ "2026-11-12T10:00": { windSpeed: 6, temperature: 30 } }),
      MIDDLE_DAY,
    );
    expect(assessment.rejectedReasons).toEqual({ wind_too_high: 1, too_hot: 1 });
  });

  it("picks the longest window", () => {
    const assessment = assessSprayWindows(
      makeHours({ "2026-11-12T05:00": { windSpeed: 9 }, "2026-11-12T20:00": { windSpeed: 9 } }),
      MIDDLE_DAY,
    );
    expect(assessment.bestWindow).toEqual({ from: "2026-11-12T06:00", to: "2026-11-12T20:00", hours: 14 });
  });

  it("picks the earliest window on a tie", () => {
    const assessment = assessSprayWindows(
      makeHours({ "2026-11-12T11:00": { windSpeed: 9 }, "2026-11-12T23:00": { windSpeed: 9 } }),
      MIDDLE_DAY,
    );
    expect(assessment.windows.map((window) => window.hours)).toEqual([11, 11]);
    expect(assessment.bestWindow).toEqual({ from: "2026-11-12T00:00", to: "2026-11-12T11:00", hours: 11 });
  });

  it("no suitable hours → canSpray false, bestWindow null", () => {
    const windy = Object.fromEntries(
      Array.from({ length: 24 }, (_, hour) => [hourIso(MIDDLE_DAY, hour), { windSpeed: 8 }]),
    );
    const assessment = assessSprayWindows(makeHours(windy), MIDDLE_DAY);
    expect(assessment).toEqual({ canSpray: false, bestWindow: null, windows: [], rejectedReasons: { wind_too_high: 24 } });
  });

  it("returns no windows for a date outside the forecast", () => {
    const assessment = assessSprayWindows(makeHours(), "2026-11-20");
    expect(assessment).toEqual({ canSpray: false, bestWindow: null, windows: [], rejectedReasons: {} });
  });

  it("custom thresholds override defaults", () => {
    const assessment = assessSprayWindows(makeHours({ "2026-11-12T10:00": { windSpeed: 5 } }), MIDDLE_DAY, {
      maxWindSpeed: 6,
    });
    expect(assessment.windows).toHaveLength(1);
  });
});
