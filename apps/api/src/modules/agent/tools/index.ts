import type { AgentPorts } from "@/modules/agent/agent.types";
import { createGetWeatherTool } from "@/modules/agent/tools/get-weather/tool";
import { createSearchDocsTool } from "@/modules/agent/tools/search-docs/tool";
import { createSprayOutlookTool } from "@/modules/agent/tools/spray-outlook/tool";
import { createSprayWindowTool } from "@/modules/agent/tools/spray-window/tool";
import { createFieldTools } from "@/modules/agent/tools/field-tools/tool";

export function createAgentTools({ weather, rag, fields, approvals }: AgentPorts) {
  return {
    getWeather: createGetWeatherTool(weather),
    sprayWindow: createSprayWindowTool(weather),
    sprayOutlook: createSprayOutlookTool(weather),
    searchDocs: createSearchDocsTool(rag),
    ...(fields && approvals ? createFieldTools({ fields, approvals }) : {}),
  };
}

export type AgentTools = ReturnType<typeof createAgentTools>;

export function agentToolsContext(now: Date = new Date(), userId?: string) {
  const user = { now, userId };
  return {
    getWeather: { now },
    sprayWindow: { now },
    sprayOutlook: { now },
    listFields: user,
    getField: user,
    proposeSaveField: user,
    proposeUpdateField: user,
    proposeDeleteField: user,
  };
}
