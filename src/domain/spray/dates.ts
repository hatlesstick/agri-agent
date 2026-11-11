export const RELATIVE_DAYS = ["today", "tomorrow", "day_after_tomorrow"] as const;

export type RelativeDay = (typeof RELATIVE_DAYS)[number];

const DAY_OFFSETS: Record<RelativeDay, number> = {
  today: 0,
  tomorrow: 1,
  day_after_tomorrow: 2,
};

function isRelativeDay(day: string): day is RelativeDay {
  return (RELATIVE_DAYS as readonly string[]).includes(day);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function resolveDay(day: string, timeZone: string, now: Date = new Date()): string {
  if (!isRelativeDay(day)) return day;
  return addDays(todayIn(timeZone, now), DAY_OFFSETS[day]);
}
