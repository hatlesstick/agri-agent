import { Controller, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { ForgetResponse } from "@agri/shared/contracts";
import { ProxyAuthGuard, RateLimited, RateLimitGuard } from "@/common/http";
import { CurrentUserId, SessionGuard } from "@/modules/identity";
import { PrivacyRepository } from "@/modules/privacy/repositories/PrivacyRepository";

@ApiTags("privacy")
@Controller("forget")
@UseGuards(ProxyAuthGuard, RateLimitGuard, SessionGuard)
export class PrivacyController {
  constructor(@Inject(PrivacyRepository) private readonly privacy: PrivacyRepository) {}

  @Post()
  @HttpCode(200)
  @RateLimited("session")
  async forget(@CurrentUserId() userId: string): Promise<ForgetResponse> {
    const deleted = await this.privacy.forget(userId);
    return { deleted };
  }
}
