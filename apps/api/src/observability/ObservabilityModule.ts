import { Global, Module } from "@nestjs/common";
import { flushAgentTelemetry, isTelemetryEnabled } from "@/observability/telemetry/agent-telemetry";
import { HealthController } from "@/observability/health/HealthController";
import { TELEMETRY, TelemetryFlushInterceptor, type TelemetryControl } from "@/observability/telemetry/TelemetryFlushInterceptor";

const agentTelemetry: TelemetryControl = { enabled: isTelemetryEnabled, flush: flushAgentTelemetry };

@Global()
@Module({
  controllers: [HealthController],
  providers: [{ provide: TELEMETRY, useValue: agentTelemetry }, TelemetryFlushInterceptor],
  exports: [TELEMETRY, TelemetryFlushInterceptor],
})
export class ObservabilityModule {}
