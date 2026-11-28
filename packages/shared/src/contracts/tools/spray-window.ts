import { z } from "zod";
import { cityNameSchema } from "@/contracts/tools/shared";
import { RELATIVE_DAYS } from "@/relative-day";
import { fieldIdSchema } from "@/contracts/tools/fields";

const REJECTION_REASONS = [
  "wind_too_low",
  "wind_too_high",
  "gusts_too_high",
  "too_cold",
  "too_hot",
  "precipitation_nearby",
  "humidity_too_low",
  "delta_t_out_of_range",
  "inversion_risk",
  "insufficient_data",
] as const;

export const sprayWindowInputSchema = z.object({
  city: cityNameSchema.optional().describe("City name, when the question is about a city; omit when it is about a saved field"),
  fieldId: fieldIdSchema.optional().describe("Id of one of the user's saved fields from listFields; use it for questions about 'my field'"),
  date: z
    .union([z.enum(RELATIVE_DAYS), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .describe("Day to assess: today, tomorrow, day_after_tomorrow, or an explicit YYYY-MM-DD date"),
});

const sprayWindowSlotSchema = z.object({
  from: z.string(),
  to: z.string(),
  hours: z.number().int().positive(),
});

export const sprayWindowErrorSchema = z.object({
  error: z.enum([
    "city_not_found",
    "city_required",
    "weather_unavailable",
    "date_out_of_range",
    "date_in_past",
    "field_not_found",
    "not_signed_in",
  ]),
});

export const sprayAssessmentSchema = z.object({
  city: z.string(),
  date: z.string(),
  timezone: z.string(),
  canSpray: z.boolean(),
  bestWindow: sprayWindowSlotSchema.nullable(),
  windows: z.array(sprayWindowSlotSchema),
  rejectedReasons: z.partialRecord(z.enum(REJECTION_REASONS), z.number().int().nonnegative()),
});

export const sprayWindowOutputSchema = z.union([sprayWindowErrorSchema, sprayAssessmentSchema]);

export type SprayWindowInput = z.infer<typeof sprayWindowInputSchema>;
export type SprayWindowOutput = z.infer<typeof sprayWindowOutputSchema>;
