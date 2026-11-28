import { z } from "zod";

export const ERROR_CODES = [
  "invalid_request",
  "payload_too_large",
  "part_too_large",
  "message_too_long",
  "conversation_too_long",
  "rate_limited",
  "forbidden",
  "not_found",
  "action_not_awaiting",
  "action_expired",
  "action_failed",
  "daily_limit_reached",
  "blocked_input",
  "spray_window_not_called",
  "invalid_model_output",
  "model_busy",
  "model_timeout",
  "internal_error",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string(),
  code: z.enum(ERROR_CODES),
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
