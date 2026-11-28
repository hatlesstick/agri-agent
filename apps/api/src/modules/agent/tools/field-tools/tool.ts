import { tool } from "ai";
import { z } from "zod";
import { fieldIdSchema, fieldInputSchema, fieldPatchSchema } from "@agri/shared/contracts";
import type { AgentApprovalsPort, AgentFieldsPort } from "@/modules/agent/agent.types";
import { userContextSchema } from "@/modules/agent/tools/shared/schemas";

const PROPOSAL_MINUTES = 30;

export type FieldToolPorts = { fields: AgentFieldsPort; approvals: AgentApprovalsPort };

function summary(field: { id: string; name: string; crop: string | null; areaHa: string | null }) {
  return { id: field.id, name: field.name, crop: field.crop, areaHa: field.areaHa };
}

export function createFieldTools({ fields, approvals }: FieldToolPorts) {
  const noUser = { error: "not_signed_in" } as const;

  return {
    listFields: tool({
      description: "List the user's saved fields (id, name, crop, area). Use it before answering about 'my field'.",
      inputSchema: z.object({}),
      contextSchema: userContextSchema,
      execute: async (_input, { context }) => {
        if (!context.userId) return noUser;
        const rows = await fields.list(context.userId);
        return { fields: rows.map(summary) };
      },
    }),

    getField: tool({
      description: "Get one of the user's saved fields by id, including its coordinates.",
      inputSchema: z.object({ id: fieldIdSchema }),
      contextSchema: userContextSchema,
      execute: async ({ id }, { context }) => {
        if (!context.userId) return noUser;
        const field = await fields.getById(context.userId, id);
        return field ? { field: { ...summary(field), lat: field.lat, lon: field.lon, notes: field.notes } } : { error: "field_not_found" as const };
      },
    }),

    proposeSaveField: tool({
      description:
        "Propose saving a new field. Nothing is saved until the user confirms in the app; tell the user the field awaits confirmation.",
      inputSchema: fieldInputSchema,
      contextSchema: userContextSchema,
      execute: async (input, { context, toolCallId }) => {
        if (!context.userId) return noUser;
        const action = await approvals.propose({
          userId: context.userId,
          channel: "web",
          type: "field.save",
          payload: input,
          expiresAt: new Date(context.now.getTime() + PROPOSAL_MINUTES * 60_000),
          idempotencyKey: `field.save:${toolCallId}`,
        });
        return { status: "awaiting_confirmation" as const, actionId: action.id };
      },
    }),

    proposeUpdateField: tool({
      description: "Propose changing one of the user's fields. Nothing changes until the user confirms in the app.",
      inputSchema: z.object({ id: fieldIdSchema, patch: fieldPatchSchema }),
      contextSchema: userContextSchema,
      execute: async ({ id, patch }, { context, toolCallId }) => {
        if (!context.userId) return noUser;
        const field = await fields.getById(context.userId, id);
        if (!field) return { error: "field_not_found" as const };
        const action = await approvals.propose({
          userId: context.userId,
          channel: "web",
          type: "field.update",
          payload: { id, patch, fieldName: field.name },
          expiresAt: new Date(context.now.getTime() + PROPOSAL_MINUTES * 60_000),
          idempotencyKey: `field.update:${toolCallId}`,
        });
        return { status: "awaiting_confirmation" as const, actionId: action.id };
      },
    }),

    proposeDeleteField: tool({
      description: "Propose deleting one of the user's fields. Nothing is deleted until the user confirms in the app.",
      inputSchema: z.object({ id: fieldIdSchema }),
      contextSchema: userContextSchema,
      execute: async ({ id }, { context, toolCallId }) => {
        if (!context.userId) return noUser;
        const field = await fields.getById(context.userId, id);
        if (!field) return { error: "field_not_found" as const };
        const action = await approvals.propose({
          userId: context.userId,
          channel: "web",
          type: "field.delete",
          payload: { id, fieldName: field.name },
          expiresAt: new Date(context.now.getTime() + PROPOSAL_MINUTES * 60_000),
          idempotencyKey: `field.delete:${toolCallId}`,
        });
        return { status: "awaiting_confirmation" as const, actionId: action.id };
      },
    }),
  };
}
