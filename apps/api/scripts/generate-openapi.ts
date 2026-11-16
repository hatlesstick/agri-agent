import "reflect-metadata";
import { writeFileSync } from "node:fs";
import { buildOpenApiDocument } from "@/common/openapi";
import { loadApiEnv } from "@/config";
import { createApp } from "@/bootstrap/create-app";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, inner]) => [key, sortKeys(inner)]));
  }
  return value;
}

const env = loadApiEnv({
  ...process.env,
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  OPEN_METEO_GEOCODING_URL: process.env.OPEN_METEO_GEOCODING_URL ?? "https://geocoding-api.open-meteo.com/v1/search",
  OPEN_METEO_FORECAST_URL: process.env.OPEN_METEO_FORECAST_URL ?? "https://api.open-meteo.com/v1/forecast",
});
const app = await createApp(env);
await app.init();
writeFileSync(new URL("../openapi.json", import.meta.url), `${JSON.stringify(sortKeys(buildOpenApiDocument(app)), null, 2)}\n`);
await app.close();
