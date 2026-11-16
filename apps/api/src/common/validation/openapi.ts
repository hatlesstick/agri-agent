import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import { z } from "zod";
import { problemDetailsSchema } from "@agri/shared/contracts";
import type { ApiEnv } from "@/config";

type SchemaObject = NonNullable<NonNullable<OpenAPIObject["components"]>["schemas"]>[string];

export function openApiSchema(schema: z.ZodType): SchemaObject {
  return z.toJSONSchema(schema, { target: "openapi-3.0", unrepresentable: "any" }) as SchemaObject;
}

export const SHARED_SCHEMAS = { ProblemDetails: problemDetailsSchema } as const;

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("agri-agent API")
    .setDescription("Spraying-conditions agent: chat stream, structured spray check, health. Errors are RFC 9457 problem details with a stable `code`.")
    .setVersion("1.0.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      ...Object.fromEntries(Object.entries(SHARED_SCHEMAS).map(([name, schema]) => [name, openApiSchema(schema)])),
    },
  };
  return document;
}

export function setupSwagger(app: INestApplication, env: ApiEnv): void {
  if (env.NODE_ENV === "production" && !env.SWAGGER_ENABLED) return;
  SwaggerModule.setup("docs", app, () => buildOpenApiDocument(app), { jsonDocumentUrl: "openapi.json" });
}
