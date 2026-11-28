import { z } from "zod";

export const forgetResponseSchema = z.object({
  deleted: z.object({
    fields: z.number().int().nonnegative(),
    actions: z.number().int().nonnegative(),
    conversations: z.number().int().nonnegative(),
  }),
});

export type ForgetResponse = z.infer<typeof forgetResponseSchema>;
