import { z } from "zod";
import type { FieldsRepository } from "@/modules/fields";
import type { ActionExecutor } from "@/modules/approvals/approvals.types";

const fieldInput = z.object({
  name: z.string().trim().min(1).max(100),
  crop: z.string().trim().max(60).nullable().optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  areaHa: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const fieldIdPayload = z.object({ id: z.uuid() });
const fieldUpdatePayload = fieldIdPayload.extend({ patch: fieldInput.partial() });

export function fieldExecutors(fields: FieldsRepository): Record<string, ActionExecutor> {
  return {
    "field.save": async (action) => {
      await fields.create(action.userId, fieldInput.parse(action.payload));
    },
    "field.update": async (action) => {
      const { id, patch } = fieldUpdatePayload.parse(action.payload);
      const updated = await fields.update(action.userId, id, patch);
      if (!updated) throw new Error("field not found");
    },
    "field.delete": async (action) => {
      const { id } = fieldIdPayload.parse(action.payload);
      const removed = await fields.delete(action.userId, id);
      if (!removed) throw new Error("field not found");
    },
  };
}
