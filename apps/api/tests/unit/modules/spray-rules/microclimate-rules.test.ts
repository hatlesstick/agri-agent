import { describe, expect, it } from "vitest";
import { assessSprayDay } from "@/modules/spray-rules/assess-spray-day";
import type { HourlyPoint } from "@/modules/weather/weather.types";

const DAYS = ["2026-11-11", "2026-11-12", "2026-11-13"];
const DATE = DAYS[1];

function hourIso(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00`;
}

function hours(base: Partial<HourlyPoint>, overrides: Record<string, Partial<HourlyPoint>> = {}): HourlyPoint[] {
  return DAYS.flatMap((date) =>
    Array.from({ length: 24 }, (_, hour) => {
      const time = hourIso(date, hour);
      return { time, temperature: 15, windSpeed: 2, windGusts: 3, precipitation: 0, precipitationProbability: 0, humidity: 70, ...base, ...overrides[time] };
    }),
  );
}

function reasonsAt(time: string, point: Partial<HourlyPoint>): string[] {
  const assessment = assessSprayDay({ hourly: hours({}, { [time]: point }), date: DATE });
  return Object.keys(assessment.rejectedReasons);
}

describe("Delta T rule", () => {
  it("rejects Delta T above 8 °C as delta_t_out_of_range", () => {
    expect(reasonsAt(hourIso(DATE, 14), { temperature: 30, humidity: 20 })).toContain("delta_t_out_of_range");
  });

  it("rejects Delta T below 2 °C (saturated, inversion-prone air)", () => {
    expect(reasonsAt(hourIso(DATE, 14), { temperature: 12, humidity: 100 })).toContain("delta_t_out_of_range");
  });

  it("accepts Delta T inside 2 to 8 °C", () => {
    expect(reasonsAt(hourIso(DATE, 14), { temperature: 15, humidity: 70 })).not.toContain("delta_t_out_of_range");
  });

  it("reports insufficient data when humidity is missing", () => {
    expect(reasonsAt(hourIso(DATE, 14), { humidity: null })).toContain("insufficient_data");
  });
});

describe("inversion rule", () => {
  it("rejects calm wind at night as inversion_risk", () => {
    expect(reasonsAt(hourIso(DATE, 22), { windSpeed: 1 })).toContain("inversion_risk");
  });

  it("rejects calm wind in the early morning as inversion_risk", () => {
    expect(reasonsAt(hourIso(DATE, 6), { windSpeed: 1 })).toContain("inversion_risk");
  });

  it("does not flag calm wind in the afternoon", () => {
    expect(reasonsAt(hourIso(DATE, 14), { windSpeed: 1 })).not.toContain("inversion_risk");
  });

  it("does not flag light breeze at night (force 2 and above)", () => {
    expect(reasonsAt(hourIso(DATE, 22), { windSpeed: 2 })).not.toContain("inversion_risk");
  });
});

describe("gust rule (developer rule: 10 m/s, whole hour)", () => {
  it("rejects an hour whose gusts exceed 10 m/s as gusts_too_high", () => {
    expect(reasonsAt(hourIso(DATE, 14), { windGusts: 11 })).toContain("gusts_too_high");
  });

  it("accepts an hour whose gusts are exactly 10 m/s", () => {
    expect(reasonsAt(hourIso(DATE, 14), { windGusts: 10 })).not.toContain("gusts_too_high");
  });

  it("reports insufficient data when gusts are missing", () => {
    expect(reasonsAt(hourIso(DATE, 14), { windGusts: null })).toContain("insufficient_data");
  });
});
