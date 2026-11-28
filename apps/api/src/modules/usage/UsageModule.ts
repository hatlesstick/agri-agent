import { Module } from "@nestjs/common";
import { UsageService } from "@/modules/usage/UsageService";
import { UsageRepository } from "@/modules/usage/repositories/UsageRepository";

@Module({
  providers: [UsageRepository, UsageService],
  exports: [UsageService],
})
export class UsageModule {}
