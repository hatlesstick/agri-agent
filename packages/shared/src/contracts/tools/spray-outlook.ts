import { z } from "zod";
import { cityNameSchema } from "@/contracts/tools/shared";
import { sprayAssessmentSchema, sprayWindowErrorSchema } from "@/contracts/tools/spray-window";
import { fieldIdSchema } from "@/contracts/tools/fields";

export const sprayOutlookInputSchema = z.object({
  city: cityNameSchema.optional().describe("City name, when the question is about a city; omit when it is about a saved field"),
  fieldId: fieldIdSchema.optional().describe("Id of one of the user's saved fields from listFields; use it for questions about 'my field'"),
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
