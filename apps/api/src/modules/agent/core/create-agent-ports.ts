import { createStandaloneRagEngine, type RagEngine } from "@/modules/rag";
import { OpenMeteoClient, WeatherRepository } from "@/modules/weather";

export type StandaloneAgentPorts = { weather: WeatherRepository; rag: RagEngine };

export function createAgentPorts(): StandaloneAgentPorts {
  return { weather: new WeatherRepository(new OpenMeteoClient()), rag: createStandaloneRagEngine() };
}
