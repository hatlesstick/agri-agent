import { z } from "zod";

export const meResponseSchema = z.object({
  userId: z.uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.url().nullable(),
  providers: z.array(z.enum(["web", "github", "google"])),
  signedIn: z.boolean(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
