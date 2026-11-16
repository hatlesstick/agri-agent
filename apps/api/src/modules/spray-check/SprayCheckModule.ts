import { Module } from "@nestjs/common";
import { AgentBridgeModule } from "@/modules/agent-bridge";
import { SprayCheckController } from "@/modules/spray-check/SprayCheckController";
import { SprayCheckService } from "@/modules/spray-check/SprayCheckService";

@Module({
  imports: [AgentBridgeModule],
  controllers: [SprayCheckController],
  providers: [SprayCheckService],
})
export class SprayCheckModule {}
