import { z } from "zod";

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
