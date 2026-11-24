import type { AgriChatMessage } from "@agri/shared/contracts";
import type { SprayWindowSlot, WeatherHour } from "@/ui/helpers/hour-strip";
import { isToolPart, type MessagePart } from "@/ui/helpers/tool-parts";

export const FORECAST_STORAGE_KEY = "agri-last-forecast";

export type StoredForecast = { city: string; date: string; windows: SprayWindowSlot[]; hourly: WeatherHour[] };

type ToolRecord = { city: string; date: string; windows: SprayWindowSlot[] } | { city: string; hourly: WeatherHour[] };

function completed(part: MessagePart, name: string): Record<string, unknown> | null {
  if (!isToolPart(part) || part.type !== `tool-${name}` || part.state !== "output-available") return null;
  const output = part.output as Record<string, unknown> | null;
  return output && typeof output === "object" && !("error" in output) ? output : null;
}

function latest(messages: AgriChatMessage[], read: (part: MessagePart) => ToolRecord | null): ToolRecord | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const parts = messages[index].parts;
    for (let position = parts.length - 1; position >= 0; position -= 1) {
      const found = read(parts[position]);
      if (found) return found;
    }
  }
  return null;
}

export function buildForecast(messages: AgriChatMessage[]): StoredForecast | null {
  const spray = latest(messages, (part) => {
    const output = completed(part, "sprayWindow");
    if (!output || typeof output.city !== "string" || typeof output.date !== "string" || !Array.isArray(output.windows)) return null;
    return { city: output.city, date: output.date, windows: output.windows as SprayWindowSlot[] };
  });
  if (!spray || !("date" in spray)) return null;
  const weather = latest(messages, (part) => {
    const output = completed(part, "getWeather");
    if (!output || typeof output.city !== "string" || !Array.isArray(output.hourly)) return null;
    return { city: output.city, hourly: output.hourly as WeatherHour[] };
  });
  const sameCity = weather && "hourly" in weather && weather.city.toLowerCase() === spray.city.toLowerCase();
  return {
    city: spray.city,
    date: spray.date,
    windows: spray.windows,
    hourly: sameCity ? weather.hourly.map((point) => ({ time: point.time, windSpeed: point.windSpeed, precipitation: point.precipitation })) : [],
  };
}

export function parseStoredForecast(raw: string | null): StoredForecast | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredForecast>;
    if (typeof value.city !== "string" || typeof value.date !== "string" || !Array.isArray(value.windows) || !Array.isArray(value.hourly)) return null;
    return { city: value.city, date: value.date, windows: value.windows, hourly: value.hourly };
  } catch {
    return null;
  }
}
