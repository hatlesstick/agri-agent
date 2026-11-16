import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { AppModule } from "@/AppModule";
import { loadApiEnv, type ApiEnv } from "@/config";
import { DATABASE, type DatabaseHandle } from "@/database";
import { configureApp } from "@/bootstrap/create-app";

export type ProviderOverride = { token: unknown; useValue: unknown };

const NO_DATABASE: DatabaseHandle = {
  get: () => {
    throw new Error("This test has no database; use testDatabase() from @tests/support/test-database");
  },
  ping: async () => true,
  close: async () => {},
};

export async function testApp(overrides: ProviderOverride[] = [], env: Record<string, string | undefined> = {}): Promise<NestExpressApplication> {
  const apiEnv: ApiEnv = loadApiEnv({ ...process.env, ...env });
  let builder = Test.createTestingModule({ imports: [AppModule.register(apiEnv)] });
  const withDefaults = overrides.some(({ token }) => token === DATABASE) ? overrides : [{ token: DATABASE, useValue: NO_DATABASE }, ...overrides];
  for (const { token, useValue } of withDefaults) builder = builder.overrideProvider(token).useValue(useValue);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, bufferLogs: true });
  configureApp(app, apiEnv);
  await app.init();
  return app;
}
