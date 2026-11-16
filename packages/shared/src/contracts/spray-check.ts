import { z } from "zod";

export const sprayCheckRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
});

export const sprayCheckResponseSchema = z.object({
  city: z.string().describe("City the answer is about, as returned by the sprayWindow tool"),
  canSpray: z.boolean().describe("Exactly the canSpray value returned by sprayWindow"),
  bestWindow: z
    .object({
      from: z.string().describe("City-local start time, YYYY-MM-DDTHH:mm"),
      to: z.string().describe("City-local end time, YYYY-MM-DDTHH:mm"),
    })
    .nullable()
    .describe("Exactly the bestWindow returned by sprayWindow, without the hours field; null when there is none"),
  reason: z.string().describe("Short explanation for the farmer in the language of the question"),
});

export type SprayCheckRequest = z.infer<typeof sprayCheckRequestSchema>;
export type SprayCheckResponse = z.infer<typeof sprayCheckResponseSchema>;
