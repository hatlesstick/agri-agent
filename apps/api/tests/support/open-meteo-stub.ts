import { readFileSync } from "node:fs";
import { vi } from "vitest";

const FIXTURES = new URL("../../../../packages/agent/tests/fixtures/weather/", import.meta.url);

const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(name, FIXTURES), "utf8"));

export const FIXTURE_NOW = new Date("2026-11-11T08:30:00Z");

export function stubOpenMeteo(): void {
  const geocoding = fixture("geocoding-lyon.json");
  const forecast = fixture("forecast-lyon.json");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => Response.json(new URL(String(input)).host.startsWith("geocoding") ? geocoding : forecast)),
  );
}
