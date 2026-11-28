import type { WeatherPort } from "@/modules/weather";
import type { AgentFieldsPort } from "@/modules/agent/agent.types";

export type WeatherToolDeps = { weather: WeatherPort; now?: Date; fields?: AgentFieldsPort; userId?: string };
