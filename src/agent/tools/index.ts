import { getWeatherTool } from "@/agent/tools/get-weather/tool";
import { sprayWindowTool } from "@/agent/tools/spray-window/tool";

export const agentTools = {
  getWeather: getWeatherTool,
  sprayWindow: sprayWindowTool,
};

export function agentToolsContext(now: Date = new Date()) {
  return {
    getWeather: { now },
    sprayWindow: { now },
  };
}
