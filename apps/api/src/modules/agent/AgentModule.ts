import { Module } from "@nestjs/common";
import { AGENT_PORTS } from "@/modules/agent/agent.tokens";
import type { AgentPorts } from "@/modules/agent/agent.types";
import { RAG_ENGINE, RagModule, type RagEngine } from "@/modules/rag";
import { WEATHER_PORT, WeatherModule, type WeatherPort } from "@/modules/weather";

@Module({
  imports: [WeatherModule, RagModule],
  providers: [
    {
      provide: AGENT_PORTS,
      inject: [WEATHER_PORT, RAG_ENGINE],
      useFactory: (weather: WeatherPort, rag: RagEngine): AgentPorts => ({ weather, rag }),
    },
  ],
  exports: [AGENT_PORTS, WeatherModule, RagModule],
})
export class AgentModule {}
