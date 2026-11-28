import { Module } from "@nestjs/common";
import { AGENT_PORTS } from "@/modules/agent/agent.tokens";
import type { AgentPorts } from "@/modules/agent/agent.types";
import { PendingActionsService } from "@/modules/approvals";
import { ApprovalsModule } from "@/modules/approvals";
import { FIELDS_REPOSITORY, FieldsModule, type FieldsRepository } from "@/modules/fields";
import { RAG_ENGINE, RagModule, type RagEngine } from "@/modules/rag";
import { WEATHER_PORT, WeatherModule, type WeatherPort } from "@/modules/weather";

@Module({
  imports: [WeatherModule, RagModule, FieldsModule, ApprovalsModule],
  providers: [
    {
      provide: AGENT_PORTS,
      inject: [WEATHER_PORT, RAG_ENGINE, FIELDS_REPOSITORY, PendingActionsService],
      useFactory: (weather: WeatherPort, rag: RagEngine, fields: FieldsRepository, approvals: PendingActionsService): AgentPorts => ({
        weather,
        rag,
        fields,
        approvals,
      }),
    },
  ],
  exports: [AGENT_PORTS, WeatherModule, RagModule],
})
export class AgentModule {}
