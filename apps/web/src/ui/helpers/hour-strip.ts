export type HourStatus = "go" | "stop";

export type HourView = { time: string; status: HourStatus; windMs: number | null; precipMm: number | null };

export type SprayWindowSlot = { from: string; to: string };

export type WeatherHour = { time: string; windSpeed: number | null; precipitation: number | null };

export type HourStripInput = { date: string; windows: SprayWindowSlot[]; hourly: WeatherHour[] };

const FIRST_HOUR = 5;
const LAST_HOUR = 21;

const pad = (value: number) => String(value).padStart(2, "0");

export function buildHourStrip({ date, windows, hourly }: HourStripInput): HourView[] {
  const weatherByTime = new Map(hourly.map((point) => [point.time, point]));
  const hours: HourView[] = [];
  for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour += 1) {
    const stamp = `${date}T${pad(hour)}:00`;
    const inside = windows.some((window) => stamp >= window.from && stamp <= window.to);
    const weather = weatherByTime.get(stamp);
    hours.push({
      time: `${pad(hour)}:00`,
      status: inside ? "go" : "stop",
      windMs: weather?.windSpeed ?? null,
      precipMm: weather?.precipitation ?? null,
    });
  }
  return hours;
}
