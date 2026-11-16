import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { AppModule } from "@/AppModule";
import { loadApiEnv, type ApiEnv } from "@/config";
import { configureApp } from "@/create-app";

export type ProviderOverride = { token: unknown; useValue: unknown };

export async function testApp(overrides: ProviderOverride[] = [], env: Record<string, string | undefined> = {}): Promise<NestExpressApplication> {
  const apiEnv: ApiEnv = loadApiEnv({ ...process.env, ...env });
  let builder = Test.createTestingModule({ imports: [AppModule.register(apiEnv)] });
  for (const { token, useValue } of overrides) builder = builder.overrideProvider(token).useValue(useValue);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, bufferLogs: true });
  configureApp(app, apiEnv);
  await app.init();
  return app;
}
