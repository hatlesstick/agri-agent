import { DocsRepository, JsonRagEngine } from "@/modules/rag";
import { OpenMeteoClient, WeatherRepository } from "@/modules/weather";

export type StandaloneAgentPorts = { weather: WeatherRepository; rag: JsonRagEngine };

export function createAgentPorts(): StandaloneAgentPorts {
  return { weather: new WeatherRepository(new OpenMeteoClient()), rag: new JsonRagEngine(new DocsRepository()) };
}
