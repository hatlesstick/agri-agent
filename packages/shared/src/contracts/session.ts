import { z } from "zod";

export const sessionResponseSchema = z.object({
  userId: z.uuid(),
  createdAt: z.iso.datetime(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;
