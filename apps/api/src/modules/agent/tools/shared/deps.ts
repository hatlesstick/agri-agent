import type { WeatherPort } from "@/modules/weather";

export type WeatherToolDeps = { weather: WeatherPort; now?: Date };
