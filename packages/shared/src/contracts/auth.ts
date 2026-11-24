import { z } from "zod";

export const authProvidersResponseSchema = z.object({
  providers: z.array(z.enum(["github", "google"])),
});

export type AuthProvidersResponse = z.infer<typeof authProvidersResponseSchema>;
