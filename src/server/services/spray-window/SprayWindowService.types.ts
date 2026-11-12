import type { HourlyPoint } from "@/server/repositories/weather/weather.types";

export type SprayThresholds = {
  minWindSpeed: number;
  maxWindSpeed: number;
  minTemperature: number;
  maxTemperature: number;
  dryHoursBefore: number;
  dryHoursAfter: number;
  minPrecipitationMm: number;
  minHumidity: number | null;
};

export type RejectionReason =
  | "wind_too_low"
  | "wind_too_high"
  | "too_cold"
  | "too_hot"
  | "precipitation_nearby"
  | "humidity_too_low"
  | "insufficient_data";

export type SprayWindow = { from: string; to: string; hours: number };

export type SprayAssessment = {
  canSpray: boolean;
  bestWindow: SprayWindow | null;
  windows: SprayWindow[];
  rejectedReasons: Partial<Record<RejectionReason, number>>;
};

export type AssessmentOptions = { notBefore?: string };

export type SprayWindowInput = { hourly: HourlyPoint[]; date: string; thresholds?: Partial<SprayThresholds>; options?: AssessmentOptions };
