import { Global, Module, type DynamicModule } from "@nestjs/common";
import type { ApiEnv } from "@/config/api-env";
import { API_ENV } from "@/config/config.tokens";

@Global()
@Module({})
export class ConfigModule {
  static forRoot(env: ApiEnv): DynamicModule {
    return { module: ConfigModule, providers: [{ provide: API_ENV, useValue: env }], exports: [API_ENV] };
  }
}
