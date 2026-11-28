import { z } from "zod";

export const clockContextSchema = z.object({
  now: z.date(),
});

export type ClockContext = z.infer<typeof clockContextSchema>;

export const userContextSchema = z.object({
  userId: z.string().uuid().optional(),
  now: z.date(),
});

export const weatherContextSchema = userContextSchema;

export type UserContext = z.infer<typeof userContextSchema>;
