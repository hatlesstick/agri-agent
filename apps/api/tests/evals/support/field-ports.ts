import type { AgentApprovalsPort, AgentFieldsPort } from "@/modules/agent/agent.types";
import type { Field } from "@/modules/fields";
import type { PendingActionRecord, ProposeInput } from "@/modules/approvals/approvals.types";

export const EVAL_USER_ID = "11111111-1111-4111-8111-111111111111";

const WHEAT: Field = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: EVAL_USER_ID,
  name: "Wheat near Lyon",
  crop: "wheat",
  lat: 45.76,
  lon: 4.84,
  areaHa: "12.50",
  notes: null,
  createdAt: new Date("2026-11-01T00:00:00Z"),
  updatedAt: new Date("2026-11-01T00:00:00Z"),
} as Field;

export function evalFieldPorts(): { fields: AgentFieldsPort; approvals: AgentApprovalsPort & { proposals: ProposeInput[] } } {
  const proposals: ProposeInput[] = [];
  return {
    fields: {
      list: async () => [WHEAT],
      getById: async (_user, id) => (id === WHEAT.id ? WHEAT : null),
    },
    approvals: {
      proposals,
      propose: async (input): Promise<PendingActionRecord> => {
        proposals.push(input);
        return { id: "33333333-3333-4333-8333-333333333333", userId: input.userId, type: input.type, payload: input.payload, status: "awaiting_confirmation", expiresAt: input.expiresAt };
      },
    },
  };
}
