import type { AgentPorts } from "@/ports";
import { createGetWeatherTool } from "@/tools/get-weather/tool";
import { createSearchDocsTool } from "@/tools/search-docs/tool";
import { createSprayOutlookTool } from "@/tools/spray-outlook/tool";
import { createSprayWindowTool } from "@/tools/spray-window/tool";

export function createAgentTools({ weather, rag }: AgentPorts) {
  return {
    getWeather: createGetWeatherTool(weather),
    sprayWindow: createSprayWindowTool(weather),
    sprayOutlook: createSprayOutlookTool(weather),
    searchDocs: createSearchDocsTool(rag),
  };
}

export type AgentTools = ReturnType<typeof createAgentTools>;

export function agentToolsContext(now: Date = new Date()) {
  return {
    getWeather: { now },
    sprayWindow: { now },
    sprayOutlook: { now },
  };
}
