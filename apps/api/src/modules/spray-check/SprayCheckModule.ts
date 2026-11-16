import { Module } from "@nestjs/common";
import { AgentModule } from "@/modules/agent";
import { SprayCheckController } from "@/modules/spray-check/SprayCheckController";
import { SprayCheckService } from "@/modules/spray-check/SprayCheckService";

@Module({
  imports: [AgentModule],
  controllers: [SprayCheckController],
  providers: [SprayCheckService],
})
export class SprayCheckModule {}
