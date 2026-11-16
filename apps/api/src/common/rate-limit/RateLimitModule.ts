import { Global, Module } from "@nestjs/common";
import { createRateLimiters } from "@/common/rate-limit/rate-limit";
import { RATE_LIMITERS } from "@/common/rate-limit/rate-limit.tokens";
import { API_ENV, type ApiEnv } from "@/config";

@Global()
@Module({
  providers: [
    {
      provide: RATE_LIMITERS,
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => createRateLimiters({ perClientPerMinute: env.RATE_LIMIT_PER_MINUTE, globalPerMinute: env.GLOBAL_RATE_LIMIT_PER_MINUTE }),
    },
  ],
  exports: [RATE_LIMITERS],
})
export class RateLimitModule {}
