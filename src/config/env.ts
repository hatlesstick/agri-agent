import { z } from "zod";

const httpsUrl = z.url({ protocol: /^https$/ });

const optionalEmpty = (value: unknown) => (value === "" ? undefined : value);

const serverEnvSchema = z.object({
  OPEN_METEO_GEOCODING_URL: httpsUrl,
  OPEN_METEO_FORECAST_URL: httpsUrl,
  AI_MOCK: z
    .enum(["0", "1"])
    .optional()
    .transform((value) => value === "1"),
  LANGFUSE_PUBLIC_KEY: z.string().startsWith("pk-lf-").optional(),
  LANGFUSE_SECRET_KEY: z.string().startsWith("sk-lf-").optional(),
  LANGFUSE_BASE_URL: httpsUrl.default("https://cloud.langfuse.com"),
  LANGFUSE_ENVIRONMENT: z.string().regex(/^[a-z0-9-_]+$/).default("development"),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().max(1000).default(10),
  GLOBAL_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().max(10_000).default(60),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function serverEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(
    Object.fromEntries(Object.entries(process.env).map(([key, value]) => [key, optionalEmpty(value)])),
  );
  if (!parsed.success) {
    const invalidKeys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${invalidKeys}`);
  }
  return parsed.data;
}
