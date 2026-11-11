import { z } from "zod";
import { cityNameSchema } from "@/agent/tools/shared/schemas";
import { sprayAssessmentSchema, sprayWindowErrorSchema } from "@/agent/tools/spray-window/schemas";

export const sprayOutlookInputSchema = z.object({
  city: cityNameSchema,
});

export const sprayOutlookDaySchema = sprayAssessmentSchema.pick({
  date: true,
  canSpray: true,
  bestWindow: true,
  rejectedReasons: true,
});

export const sprayOutlookReportSchema = z.object({
  city: z.string(),
  timezone: z.string(),
  days: z.array(sprayOutlookDaySchema).max(3),
});

export const sprayOutlookOutputSchema = z.union([sprayWindowErrorSchema.pick({ error: true }), sprayOutlookReportSchema]);

export type SprayOutlookInput = z.infer<typeof sprayOutlookInputSchema>;
export type SprayOutlookOutput = z.infer<typeof sprayOutlookOutputSchema>;
