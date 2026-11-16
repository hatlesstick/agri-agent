import { createGetWeatherTool } from "@/tools/get-weather/tool";
import { searchDocsTool } from "@/tools/search-docs/tool";
import { createSprayOutlookTool } from "@/tools/spray-outlook/tool";
import { createSprayWindowTool } from "@/tools/spray-window/tool";
import { weatherRepository } from "@/weather/WeatherRepository";

export const agentTools = {
  getWeather: createGetWeatherTool(weatherRepository),
  sprayWindow: createSprayWindowTool(weatherRepository),
  sprayOutlook: createSprayOutlookTool(weatherRepository),
  searchDocs: searchDocsTool,
};

export function agentToolsContext(now: Date = new Date()) {
  return {
    getWeather: { now },
    sprayWindow: { now },
    sprayOutlook: { now },
  };
}
