import { z } from "zod";

export const fieldSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  crop: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  areaHa: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const fieldsListSchema = z.object({
  fields: z.array(fieldSchema),
});

export type Field = z.infer<typeof fieldSchema>;
export type FieldsList = z.infer<typeof fieldsListSchema>;
