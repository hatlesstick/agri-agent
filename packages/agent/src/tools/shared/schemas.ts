import { z } from "zod";

export const clockContextSchema = z.object({
  now: z.date(),
});

export type ClockContext = z.infer<typeof clockContextSchema>;
