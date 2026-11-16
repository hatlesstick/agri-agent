import type { AgentPorts } from "@/ports";
import { jsonRagEngine } from "@/rag/JsonRagEngine";
import { weatherRepository } from "@/weather/WeatherRepository";

const DEFAULT_PORTS: AgentPorts = { weather: weatherRepository, rag: jsonRagEngine };

export function defaultAgentPorts(): AgentPorts {
  return DEFAULT_PORTS;
}
