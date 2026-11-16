import type { SearchHit } from "@/docs/docs.types";
import type { WeatherResult } from "@/weather/weather.types";

export type WeatherPort = { getForecast(city: string): Promise<WeatherResult> };

export type RagCandidate = SearchHit;

export type RagEngine = { search(query: string, options: { topK: number }): Promise<RagCandidate[] | null> };

export type AgentPorts = { weather: WeatherPort; rag: RagEngine };
