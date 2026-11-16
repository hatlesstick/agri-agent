import { Global, Module } from "@nestjs/common";
import { ProxyAuthGuard } from "@/common/http/ProxyAuthGuard";
import { RateLimitGuard } from "@/common/http/RateLimitGuard";

@Global()
@Module({
  providers: [ProxyAuthGuard, RateLimitGuard],
  exports: [ProxyAuthGuard, RateLimitGuard],
})
export class HttpModule {}
