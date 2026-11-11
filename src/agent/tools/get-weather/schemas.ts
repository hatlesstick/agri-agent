import { z } from "zod";
import { cityNameSchema } from "@/agent/tools/shared/schemas";

export const getWeatherInputSchema = z.object({
  city: cityNameSchema,
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
