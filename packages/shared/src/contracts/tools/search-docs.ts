import { z } from "zod";

export const searchDocsInputSchema = z.object({
  query: z.string().trim().min(3).max(200).describe("Short English search query about spraying practice, e.g. 'temperature inversion signs'"),
});

export const searchHitSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  heading: z.string(),
  text: z.string(),
  score: z.number(),
});

export const searchDocsOutputSchema = z.union([
  z.object({ error: z.literal("search_unavailable") }),
  z.object({ hits: z.array(searchHitSchema).max(5) }),
]);

export type SearchDocsInput = z.infer<typeof searchDocsInputSchema>;
export type SearchDocsOutput = z.infer<typeof searchDocsOutputSchema>;
