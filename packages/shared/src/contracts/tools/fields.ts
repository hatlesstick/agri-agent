import { z } from "zod";

export const fieldIdSchema = z.string().uuid().describe("The id of one of the user's fields, from listFields");

export const fieldInputSchema = z.object({
  name: z.string().trim().min(1).max(100).describe("Field name, for example 'Wheat near Lyon'"),
  crop: z.string().trim().max(60).nullable().optional().describe("Crop, for example wheat"),
  lat: z.number().min(-90).max(90).describe("Latitude in decimal degrees"),
  lon: z.number().min(-180).max(180).describe("Longitude in decimal degrees"),
  areaHa: z.string().nullable().optional().describe("Area in hectares as a decimal string, for example '12.50'"),
  notes: z.string().max(1000).nullable().optional(),
});

export const fieldPatchSchema = fieldInputSchema.partial();

export const fieldSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  crop: z.string().nullable(),
  areaHa: z.string().nullable(),
});

export const fieldDetailSchema = fieldSummarySchema.extend({
  lat: z.number(),
  lon: z.number(),
  notes: z.string().nullable(),
});

const notSignedInSchema = z.object({ error: z.literal("not_signed_in") });
const fieldNotFoundOrNotSignedInSchema = z.object({ error: z.enum(["not_signed_in", "field_not_found"]) });

export const listFieldsInputSchema = z.object({});
export const listFieldsOutputSchema = z.union([z.object({ fields: z.array(fieldSummarySchema) }), notSignedInSchema]);

export const getFieldInputSchema = z.object({ id: fieldIdSchema });
export const getFieldOutputSchema = z.union([z.object({ field: fieldDetailSchema }), fieldNotFoundOrNotSignedInSchema]);

export const proposeSaveFieldOutputSchema = z.union([
  z.object({ status: z.literal("awaiting_confirmation"), actionId: z.string() }),
  notSignedInSchema,
]);

export const proposeChangeFieldOutputSchema = z.union([
  z.object({ status: z.literal("awaiting_confirmation"), actionId: z.string() }),
  fieldNotFoundOrNotSignedInSchema,
]);

export const proposeUpdateFieldInputSchema = z.object({ id: fieldIdSchema, patch: fieldPatchSchema });
export const proposeDeleteFieldInputSchema = z.object({ id: fieldIdSchema });

export type FieldInput = z.infer<typeof fieldInputSchema>;
export type ListFieldsOutput = z.infer<typeof listFieldsOutputSchema>;
export type GetFieldOutput = z.infer<typeof getFieldOutputSchema>;
export type ProposeSaveFieldOutput = z.infer<typeof proposeSaveFieldOutputSchema>;
export type ProposeChangeFieldOutput = z.infer<typeof proposeChangeFieldOutputSchema>;
export type ProposeUpdateFieldInput = z.infer<typeof proposeUpdateFieldInputSchema>;
export type ProposeDeleteFieldInput = z.infer<typeof proposeDeleteFieldInputSchema>;
