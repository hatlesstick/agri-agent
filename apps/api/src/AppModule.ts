import { Module, type DynamicModule } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { CacheModule } from "@/common/cache";
import { ClockModule } from "@/common/clock";
import { HttpModule } from "@/common/http";
import { RateLimitModule } from "@/common/rate-limit";
import { ConfigModule, type ApiEnv } from "@/config";
import { DatabaseModule } from "@/database";
import { ChatModule } from "@/modules/chat";
import { SprayCheckModule } from "@/modules/spray-check";
import { ObservabilityModule, pinoHttpOptions } from "@/observability";

@Module({})
export class AppModule {
  static register(env: ApiEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(env), LoggerModule.forRoot({ pinoHttp: pinoHttpOptions(env) }), DatabaseModule, ClockModule, RateLimitModule, HttpModule, CacheModule, ObservabilityModule, ChatModule, SprayCheckModule],
    };
  }
}
