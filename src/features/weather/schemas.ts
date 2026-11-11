import { z } from "zod";

const LATIN_CITY_NAME = /^\p{Script=Latin}[\p{Script=Latin}\s'’.-]*$/u;

export const getWeatherInputSchema = z.object({
  city: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(LATIN_CITY_NAME)
    .describe("City name in English, Latin script, base form: Lyon, Munich, Kraków"),
});

export const hourlyPointSchema = z.object({
  time: z.string(),
  temperature: z.number().nullable(),
  windSpeed: z.number().nullable(),
  precipitation: z.number().nullable(),
  precipitationProbability: z.number().nullable(),
  humidity: z.number().nullable(),
});

export const weatherErrorSchema = z.object({
  error: z.enum(["city_not_found", "weather_unavailable"]),
});

export const weatherReportSchema = z.object({
  city: z.string(),
  country: z.string(),
  region: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  hourly: z.array(hourlyPointSchema).max(48),
});

export const getWeatherOutputSchema = z.union([weatherErrorSchema, weatherReportSchema]);

export type GetWeatherInput = z.infer<typeof getWeatherInputSchema>;
export type GetWeatherOutput = z.infer<typeof getWeatherOutputSchema>;

export const HOURLY_VARIABLES = {
  temperature: "temperature_2m",
  windSpeed: "wind_speed_10m",
  precipitation: "precipitation",
  precipitationProbability: "precipitation_probability",
  humidity: "relative_humidity_2m",
} as const;

export const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

const hourlySeriesSchema = z.array(z.number().nullable());

export const forecastResponseSchema = z.object({
  timezone: z.string(),
  hourly: z.object({
    time: z.array(z.string()),
    [HOURLY_VARIABLES.temperature]: hourlySeriesSchema,
    [HOURLY_VARIABLES.windSpeed]: hourlySeriesSchema,
    [HOURLY_VARIABLES.precipitation]: hourlySeriesSchema,
    [HOURLY_VARIABLES.precipitationProbability]: hourlySeriesSchema,
    [HOURLY_VARIABLES.humidity]: hourlySeriesSchema,
  }),
});
