import { z } from "zod";

export const sprayCheckSchema = z.object({
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

export const sprayCheckRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
});

export type SprayCheck = z.infer<typeof sprayCheckSchema>;

export type SprayCheckError = "spray_window_not_called" | "invalid_model_output";

export type SprayCheckTrace = {
  steps: number;
  toolCalls: Array<{ toolName: string; input: unknown }>;
};

export type SprayCheckOutcome =
  | { ok: true; result: SprayCheck; overridden: boolean; trace: SprayCheckTrace }
  | { ok: false; error: SprayCheckError; trace: SprayCheckTrace };
