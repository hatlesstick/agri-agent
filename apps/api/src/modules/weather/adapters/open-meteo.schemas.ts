import { z } from "zod";

export const HOURLY_VARIABLES = {
  temperature: "temperature_2m",
  windSpeed: "wind_speed_10m",
  precipitation: "precipitation",
  precipitationProbability: "precipitation_probability",
  humidity: "relative_humidity_2m",
} as const;

const PLACE_NAME = /^[\p{L}\p{M}][\p{L}\p{M}\s'’.,()-]{0,99}$/u;
const placeName = z.string().trim().regex(PLACE_NAME);

export const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: placeName,
        latitude: z.number(),
        longitude: z.number(),
        country: placeName,
        admin1: placeName.optional(),
      }),
    )
    .optional(),
});

const hourlySeriesSchema = z.array(z.number().nullable());

export const forecastResponseSchema = z.object({
  timezone: z.string().regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/),
  hourly: z.object({
    time: z.array(z.number().int()),
    [HOURLY_VARIABLES.temperature]: hourlySeriesSchema,
    [HOURLY_VARIABLES.windSpeed]: hourlySeriesSchema,
    [HOURLY_VARIABLES.precipitation]: hourlySeriesSchema,
    [HOURLY_VARIABLES.precipitationProbability]: hourlySeriesSchema,
    [HOURLY_VARIABLES.humidity]: hourlySeriesSchema,
  }),
});
