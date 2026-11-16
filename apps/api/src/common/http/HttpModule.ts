import { Global, Module } from "@nestjs/common";
import { CLOCK, systemClock } from "@/common/clock";
import { RATE_LIMITERS } from "@/common/http/http.tokens";
import { ProxyAuthGuard } from "@/common/http/ProxyAuthGuard";
import { createRateLimiters } from "@/common/http/rate-limit";
import { RateLimitGuard } from "@/common/http/RateLimitGuard";
import { API_ENV, type ApiEnv } from "@/config";

@Global()
@Module({
  providers: [
    {
      provide: RATE_LIMITERS,
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => createRateLimiters({ perClientPerMinute: env.RATE_LIMIT_PER_MINUTE, globalPerMinute: env.GLOBAL_RATE_LIMIT_PER_MINUTE }),
    },
    { provide: CLOCK, useValue: systemClock },
    ProxyAuthGuard,
    RateLimitGuard,
  ],
  exports: [RATE_LIMITERS, CLOCK, ProxyAuthGuard, RateLimitGuard],
})
export class HttpModule {}
