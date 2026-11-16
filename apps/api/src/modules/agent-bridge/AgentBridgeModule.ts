import { Module } from "@nestjs/common";
import { defaultAgentPorts } from "@agri/agent";
import { AGENT_PORTS } from "@/modules/agent-bridge/agent-bridge.tokens";

@Module({
  providers: [{ provide: AGENT_PORTS, useFactory: defaultAgentPorts }],
  exports: [AGENT_PORTS],
})
export class AgentBridgeModule {}
