import type { WeatherPort } from "@/ports";

export type WeatherToolDeps = { weather: WeatherPort; now?: Date };
