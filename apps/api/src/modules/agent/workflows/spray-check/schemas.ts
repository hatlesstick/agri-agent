import { sprayCheckRequestSchema, sprayCheckResponseSchema, type SprayCheckResponse } from "@agri/shared/contracts";

export { sprayCheckRequestSchema, sprayCheckResponseSchema as sprayCheckSchema };

export type SprayCheck = SprayCheckResponse;

export type SprayCheckError = "spray_window_not_called" | "invalid_model_output";

export type SprayCheckTrace = {
  steps: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: Array<{ toolName: string; input: unknown }>;
};

export type ReasonSource = "model" | "rules";

export type SprayCheckOutcome =
  | { ok: true; result: SprayCheck; overridden: boolean; reasonSource: ReasonSource; trace: SprayCheckTrace }
  | { ok: false; error: SprayCheckError; trace: SprayCheckTrace };
