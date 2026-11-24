import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { AppModule } from "@/AppModule";
import { loadApiEnv, type ApiEnv } from "@/config";
import { DATABASE, type DatabaseHandle } from "@/database";
import { configureApp } from "@/bootstrap/create-app";
import { IDENTITIES_REPOSITORY, SESSIONS_REPOSITORY, USERS_REPOSITORY } from "@/modules/identity";
import { systemClock } from "@/common/clock";
import { fakeIdentityRepositories } from "@tests/support/fake-ports";

export type ProviderOverride = { token: unknown; useValue: unknown };

const NO_DATABASE: DatabaseHandle = {
  get: () => {
    throw new Error("This test has no database; use testDatabase() from @tests/support/test-database");
  },
  ping: async () => true,
  close: async () => {},
};

function fakeDatabaseDefaults(): ProviderOverride[] {
  const identity = fakeIdentityRepositories(systemClock);
  return [
    { token: DATABASE, useValue: NO_DATABASE },
    { token: IDENTITIES_REPOSITORY, useValue: identity.identitiesRepository },
    { token: USERS_REPOSITORY, useValue: identity.usersRepository },
    { token: SESSIONS_REPOSITORY, useValue: identity.sessionsRepository },
  ];
}

export async function testApp(overrides: ProviderOverride[] = [], env: Record<string, string | undefined> = {}): Promise<NestExpressApplication> {
  const apiEnv: ApiEnv = loadApiEnv({ ...process.env, ...env });
  let builder = Test.createTestingModule({ imports: [AppModule.register(apiEnv)] });
  const withDefaults = overrides.some(({ token }) => token === DATABASE) ? overrides : [...fakeDatabaseDefaults(), ...overrides];
  for (const { token, useValue } of withDefaults) builder = builder.overrideProvider(token).useValue(useValue);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, bufferLogs: true });
  configureApp(app, apiEnv);
  await app.init();
  return app;
}
