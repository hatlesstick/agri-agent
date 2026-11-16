import type { RagEngine } from "@/modules/rag";
import type { WeatherPort } from "@/modules/weather";

export type AgentPorts = { weather: WeatherPort; rag: RagEngine };
