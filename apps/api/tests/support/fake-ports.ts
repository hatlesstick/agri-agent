import type { RagCandidate, RagEngine } from "@/modules/rag";
import type { WeatherPort } from "@/modules/weather";
import type { WeatherResult } from "@/modules/weather/weather.types";

export function fakeWeather(result: WeatherResult): WeatherPort & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async getForecast(city) {
      calls.push(city);
      return result;
    },
  };
}

export function fakeRag(result: RagCandidate[] | null | Error): RagEngine & { calls: Array<{ query: string; topK: number }> } {
  const calls: Array<{ query: string; topK: number }> = [];
  return {
    calls,
    async search(query, { topK }) {
      calls.push({ query, topK });
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

