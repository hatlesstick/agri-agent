import { z } from "zod";

const httpsUrl = z.url({ protocol: /^https$/ });

const serverEnvSchema = z.object({
  OPEN_METEO_GEOCODING_URL: httpsUrl,
  OPEN_METEO_FORECAST_URL: httpsUrl,
  AI_MOCK: z
    .enum(["0", "1"])
    .optional()
    .transform((value) => value === "1"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function serverEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const invalidKeys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${invalidKeys}`);
  }
  return parsed.data;
}
