import { Module } from "@nestjs/common";
import { IdentityModule } from "@/modules/identity";
import { PrivacyController } from "@/modules/privacy/PrivacyController";
import { PrivacyRepository } from "@/modules/privacy/repositories/PrivacyRepository";

@Module({
  imports: [IdentityModule],
  controllers: [PrivacyController],
  providers: [PrivacyRepository],
})
export class PrivacyModule {}
