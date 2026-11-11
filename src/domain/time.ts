function localParts(timeZone: string, date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function todayIn(timeZone: string, now: Date = new Date()): string {
  const { year, month, day } = localParts(timeZone, now);
  return `${year}-${month}-${day}`;
}

export function currentLocalHour(timeZone: string, now: Date = new Date()): string {
  const { year, month, day, hour } = localParts(timeZone, now);
  return `${year}-${month}-${day}T${hour}:00`;
}

export function localMinuteLabel(timeZone: string, date: Date): string {
  const { year, month, day, hour, minute } = localParts(timeZone, date);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
