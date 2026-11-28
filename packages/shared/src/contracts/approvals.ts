import { z } from "zod";

export const pendingActionSchema = z.object({
  id: z.uuid(),
  type: z.string(),
  status: z.string(),
  expiresAt: z.iso.datetime(),
  payload: z.record(z.string(), z.unknown()),
});

export const pendingActionsResponseSchema = z.object({
  actions: z.array(pendingActionSchema),
});

export const decisionResponseSchema = z.object({
  id: z.uuid(),
  status: z.string(),
});

export type PendingAction = z.infer<typeof pendingActionSchema>;
export type PendingActionsResponse = z.infer<typeof pendingActionsResponseSchema>;
export type DecisionResponse = z.infer<typeof decisionResponseSchema>;
