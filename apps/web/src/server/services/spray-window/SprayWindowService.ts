import type { HourlyPoint } from "@/server/repositories/weather/weather.types";
import type {
  RejectionReason,
  SprayAssessment,
  SprayThresholds,
  SprayWindow,
  SprayWindowInput,
} from "@/server/services/spray-window/SprayWindowService.types";

export const DEFAULT_SPRAY_THRESHOLDS: SprayThresholds = {
  minWindSpeed: 1,
  maxWindSpeed: 4,
  minTemperature: 10,
  maxTemperature: 25,
  dryHoursBefore: 3,
  dryHoursAfter: 3,
  minPrecipitationMm: 0.1,
  minHumidity: null,
};

function oneHourAfter(time: string): string {
  const next = new Date(`${time}:00Z`);
  next.setUTCHours(next.getUTCHours() + 1);
  return next.toISOString().slice(0, 16);
}

function precipitationReasons(hourly: HourlyPoint[], index: number, thresholds: SprayThresholds): RejectionReason[] {
  const first = index - thresholds.dryHoursBefore + 1;
  const last = index + 1 + thresholds.dryHoursAfter;
  if (first < 0 || last >= hourly.length) return ["insufficient_data"];

  const nearby = hourly.slice(first, last + 1).map((point) => point.precipitation);
  if (nearby.some((value) => value === null)) return ["insufficient_data"];
  if (nearby.some((value) => value !== null && value >= thresholds.minPrecipitationMm)) return ["precipitation_nearby"];
  return [];
}

function hourReasons(hourly: HourlyPoint[], index: number, thresholds: SprayThresholds): RejectionReason[] {
  const { windSpeed, temperature, humidity } = hourly[index];
  const reasons = new Set<RejectionReason>();

  if (windSpeed === null || temperature === null) reasons.add("insufficient_data");
  if (windSpeed !== null && windSpeed < thresholds.minWindSpeed) reasons.add("wind_too_low");
  if (windSpeed !== null && windSpeed > thresholds.maxWindSpeed) reasons.add("wind_too_high");
  if (temperature !== null && temperature < thresholds.minTemperature) reasons.add("too_cold");
  if (temperature !== null && temperature > thresholds.maxTemperature) reasons.add("too_hot");

  if (thresholds.minHumidity !== null) {
    if (humidity === null) reasons.add("insufficient_data");
    else if (humidity < thresholds.minHumidity) reasons.add("humidity_too_low");
  }

  for (const reason of precipitationReasons(hourly, index, thresholds)) reasons.add(reason);
  return [...reasons];
}

function toWindow(hourly: HourlyPoint[], firstIndex: number, lastIndex: number): SprayWindow {
  const next = hourly[lastIndex + 1];
  return {
    from: hourly[firstIndex].time,
    to: next ? next.time : oneHourAfter(hourly[lastIndex].time),
    hours: lastIndex - firstIndex + 1,
  };
}

export class SprayWindowService {
  assess({ hourly, date, thresholds = {}, options = {} }: SprayWindowInput): SprayAssessment {
    const { notBefore } = options;
    const rules = { ...DEFAULT_SPRAY_THRESHOLDS, ...thresholds };
    const rejectedReasons: Partial<Record<RejectionReason, number>> = {};
    const windows: SprayWindow[] = [];
    let runStart: number | null = null;

    const closeRun = (lastIndex: number) => {
      if (runStart !== null) windows.push(toWindow(hourly, runStart, lastIndex));
      runStart = null;
    };

    hourly.forEach((point, index) => {
      if (!point.time.startsWith(date) || (notBefore !== undefined && point.time < notBefore)) {
        closeRun(index - 1);
        return;
      }

      const reasons = hourReasons(hourly, index, rules);
      if (reasons.length === 0) {
        runStart ??= index;
        return;
      }

      closeRun(index - 1);
      for (const reason of reasons) rejectedReasons[reason] = (rejectedReasons[reason] ?? 0) + 1;
    });
    closeRun(hourly.length - 1);

    const bestWindow = windows.reduce<SprayWindow | null>(
      (best, window) => (best === null || window.hours > best.hours ? window : best),
      null,
    );

    return { canSpray: windows.length > 0, bestWindow, windows, rejectedReasons };
  }
}

export const sprayWindowService = new SprayWindowService();
