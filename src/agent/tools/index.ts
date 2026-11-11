import { getWeatherTool } from "@/agent/tools/get-weather/tool";
import { searchDocsTool } from "@/agent/tools/search-docs/tool";
import { sprayOutlookTool } from "@/agent/tools/spray-outlook/tool";
import { sprayWindowTool } from "@/agent/tools/spray-window/tool";

export const agentTools = {
  getWeather: getWeatherTool,
  sprayWindow: sprayWindowTool,
  sprayOutlook: sprayOutlookTool,
  searchDocs: searchDocsTool,
};

export function agentToolsContext(now: Date = new Date()) {
  return {
    getWeather: { now },
    sprayWindow: { now },
    sprayOutlook: { now },
  };
}
