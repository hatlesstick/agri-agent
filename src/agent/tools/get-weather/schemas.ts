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
