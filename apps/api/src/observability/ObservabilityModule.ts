import { Global, Module } from "@nestjs/common";
import { flushAgentTelemetry, isTelemetryEnabled } from "@/observability/agent-telemetry";
import { HealthController } from "@/observability/HealthController";
import { TELEMETRY, TelemetryFlushInterceptor, type TelemetryControl } from "@/observability/TelemetryFlushInterceptor";

const agentTelemetry: TelemetryControl = { enabled: isTelemetryEnabled, flush: flushAgentTelemetry };

@Global()
@Module({
  controllers: [HealthController],
  providers: [{ provide: TELEMETRY, useValue: agentTelemetry }, TelemetryFlushInterceptor],
  exports: [TELEMETRY, TelemetryFlushInterceptor],
})
export class ObservabilityModule {}
