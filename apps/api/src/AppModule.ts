import { Module, type DynamicModule } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { ConfigModule, type ApiEnv } from "@/config";
import { ObservabilityModule, pinoHttpOptions } from "@/observability";

@Module({})
export class AppModule {
  static register(env: ApiEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(env), LoggerModule.forRoot({ pinoHttp: pinoHttpOptions(env) }), ObservabilityModule],
    };
  }
}
