import { Module } from "@nestjs/common";
import { HealthController } from "@/observability/HealthController";

@Module({ controllers: [HealthController] })
export class ObservabilityModule {}
