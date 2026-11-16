import { StandardSchemaValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";
import { CHAT_LIMITS } from "@agri/shared";
import { AppModule } from "@/AppModule";
import { problem, ProblemDetailsFilter } from "@/common/errors";
import { securityHeaders } from "@/common/http";
import { setupSwagger } from "@/common/openapi";
import type { ApiEnv } from "@/config";

export function configureApp(app: NestExpressApplication, env: ApiEnv): void {
  app.useLogger(app.get(Logger));
  app.set("trust proxy", env.TRUSTED_PROXY_HOPS ?? 0);
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.useBodyParser("json", { limit: CHAT_LIMITS.maxBodyBytes });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: () => problem("invalid_request", 400) }));
  app.enableShutdownHooks();
  setupSwagger(app, env);
}

export async function createApp(env: ApiEnv): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(env), { bodyParser: false, bufferLogs: true });
  configureApp(app, env);
  return app;
}
