import { z } from "zod";

const httpsUrl = z.url({ protocol: /^https$/ });

const flag = z
  .enum(["0", "1"])
  .optional()
  .transform((value) => value === "1");

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  OPEN_METEO_GEOCODING_URL: httpsUrl,
  OPEN_METEO_FORECAST_URL: httpsUrl,
  AI_MOCK: flag,
  AI_GATEWAY_API_KEY: z.string().min(1).optional(),
  LANGFUSE_PUBLIC_KEY: z.string().startsWith("pk-lf-").optional(),
  LANGFUSE_SECRET_KEY: z.string().startsWith("sk-lf-").optional(),
  LANGFUSE_BASE_URL: httpsUrl.default("https://cloud.langfuse.com"),
  LANGFUSE_ENVIRONMENT: z.string().regex(/^[a-z0-9-_]+$/).default("development"),
  DAILY_TOKEN_LIMIT: z.coerce.number().int().positive().max(100_000_000).default(200_000),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().max(1000).default(10),
  SESSION_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().max(1000).default(60),
  GLOBAL_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().max(10_000).default(300),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).optional(),
  PROXY_AUTH_SECRET: z.string().min(32).optional(),
  SWAGGER_ENABLED: flag,
  CACHE_DRIVER: z.enum(["memory", "redis"]).default("memory"),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
  PUBLIC_APP_ORIGIN: z.url({ protocol: /^https?$/ }).optional(),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
});

const validatedApiEnvSchema = apiEnvSchema.superRefine((env, context) => {
  if (env.NODE_ENV === "production" && env.PROXY_AUTH_SECRET === undefined) {
    context.addIssue({ code: "custom", path: ["PROXY_AUTH_SECRET"], message: "is required in production" });
  }
  if (env.NODE_ENV === "production" && env.TRUSTED_PROXY_HOPS === undefined) {
    context.addIssue({ code: "custom", path: ["TRUSTED_PROXY_HOPS"], message: "is required in production" });
  }
  if (env.NODE_ENV === "production" && !env.AI_MOCK && env.AI_GATEWAY_API_KEY === undefined) {
    context.addIssue({ code: "custom", path: ["AI_GATEWAY_API_KEY"], message: "is required in production unless AI_MOCK=1" });
  }
  if (env.CACHE_DRIVER === "redis" && env.REDIS_URL === undefined) {
    context.addIssue({ code: "custom", path: ["REDIS_URL"], message: "is required when CACHE_DRIVER=redis" });
  }
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const API_ENV_KEYS = Object.keys(apiEnvSchema.shape) as Array<keyof ApiEnv>;

const emptyToUndefined = (value: string | undefined) => (value === "" ? undefined : value);

export function loadApiEnv(source: Record<string, string | undefined> = process.env): ApiEnv {
  const parsed = validatedApiEnvSchema.safeParse(Object.fromEntries(Object.entries(source).map(([key, value]) => [key, emptyToUndefined(value)])));
  if (!parsed.success) {
    const invalidKeys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid API environment: ${invalidKeys}`);
  }
  return parsed.data;
}

export function loadDatabaseUrl(source: Record<string, string | undefined> = process.env): string {
  const parsed = apiEnvSchema.pick({ DATABASE_URL: true }).safeParse({ DATABASE_URL: emptyToUndefined(source.DATABASE_URL) });
  if (!parsed.success) throw new Error("Invalid API environment: DATABASE_URL");
  return parsed.data.DATABASE_URL;
}
