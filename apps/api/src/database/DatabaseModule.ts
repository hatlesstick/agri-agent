import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { API_ENV, type ApiEnv } from "@/config";
import { LazyDatabase } from "@/database/connection";
import { DATABASE } from "@/database/database.tokens";
import type { DatabaseHandle } from "@/database/database.types";

@Global()
@Module({
  providers: [{ provide: DATABASE, inject: [API_ENV], useFactory: (env: ApiEnv) => new LazyDatabase(env.DATABASE_URL) }],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await this.database.close();
  }
}
