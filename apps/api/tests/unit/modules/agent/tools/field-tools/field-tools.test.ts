import { describe, expect, it, vi } from "vitest";
import { createFieldTools } from "@/modules/agent/tools/field-tools/tool";
import type { AgentApprovalsPort, AgentFieldsPort } from "@/modules/agent/agent.types";
import type { Field } from "@/modules/fields";

const USER = "11111111-1111-4111-8111-111111111111";
const FIELD_ID = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-11-28T10:00:00Z");

const wheat: Field = {
  id: FIELD_ID,
  userId: USER,
  name: "Wheat near Lyon",
  crop: "wheat",
  lat: 45.76,
  lon: 4.84,
  areaHa: "12.50",
  notes: null,
  createdAt: NOW,
  updatedAt: NOW,
} as Field;

function fakes() {
  const fields: AgentFieldsPort = {
    list: vi.fn(async () => [wheat]),
    getById: vi.fn(async (_user: string, id: string) => (id === FIELD_ID ? wheat : null)),
  };
  const approvals: AgentApprovalsPort = {
    propose: vi.fn(async (input) => ({ id: "33333333-3333-4333-8333-333333333333", userId: input.userId, type: input.type, payload: input.payload, status: "awaiting_confirmation", expiresAt: input.expiresAt })),
  };
  return { fields, approvals, tools: createFieldTools({ fields, approvals }) };
}

type Call = { toolCallId: string; context: { userId?: string; now: Date } };

function run(tool: unknown, input: unknown, call: Call): Promise<unknown> {
  const executable = tool as { execute: (input: unknown, options: Call) => Promise<unknown> };
  return executable.execute(input, call);
}

describe("field tools", () => {
  it("listFields returns the user's fields in summary form, without coordinates", async () => {
    const { tools, fields } = fakes();
    const result = await run(tools.listFields, {}, { toolCallId: "c1", context: { userId: USER, now: NOW } });
    expect(fields.list).toHaveBeenCalledWith(USER);
    expect(result).toEqual({ fields: [{ id: FIELD_ID, name: "Wheat near Lyon", crop: "wheat", areaHa: "12.50" }] });
  });

  it("getField returns the field with coordinates, and field_not_found for an unknown id", async () => {
    const { tools } = fakes();
    const found = await run(tools.getField, { id: FIELD_ID }, { toolCallId: "c2", context: { userId: USER, now: NOW } });
    expect(found).toMatchObject({ field: { id: FIELD_ID, lat: 45.76, lon: 4.84 } });
    const missing = await run(tools.getField, { id: "44444444-4444-4444-8444-444444444444" }, { toolCallId: "c3", context: { userId: USER, now: NOW } });
    expect(missing).toEqual({ error: "field_not_found" });
  });

  it("proposeSaveField creates a pending field.save action and saves nothing itself", async () => {
    const { tools, approvals } = fakes();
    const result = await run(tools.proposeSaveField, { name: "Corn", lat: 50.7, lon: 25.3 }, { toolCallId: "call-7", context: { userId: USER, now: NOW } });
    expect(result).toEqual({ status: "awaiting_confirmation", actionId: "33333333-3333-4333-8333-333333333333" });
    expect(approvals.propose).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, type: "field.save", payload: { name: "Corn", lat: 50.7, lon: 25.3 }, idempotencyKey: "field.save:call-7" }),
    );
    const [input] = (approvals.propose as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(input.expiresAt.getTime() - NOW.getTime()).toBe(30 * 60_000);
  });

  it("proposeUpdateField proposes a change only for a field the user owns", async () => {
    const { tools, approvals } = fakes();
    const owned = await run(tools.proposeUpdateField, { id: FIELD_ID, patch: { crop: "barley" } }, { toolCallId: "c4", context: { userId: USER, now: NOW } });
    expect(owned).toMatchObject({ status: "awaiting_confirmation" });
    expect(approvals.propose).toHaveBeenCalledWith(expect.objectContaining({ type: "field.update", payload: { id: FIELD_ID, patch: { crop: "barley" }, fieldName: "Wheat near Lyon" } }));
    const other = await run(tools.proposeUpdateField, { id: "44444444-4444-4444-8444-444444444444", patch: { crop: "x" } }, { toolCallId: "c5", context: { userId: USER, now: NOW } });
    expect(other).toEqual({ error: "field_not_found" });
    expect(approvals.propose).toHaveBeenCalledTimes(1);
  });

  it("proposeDeleteField proposes a field.delete for an owned field", async () => {
    const { tools, approvals } = fakes();
    const result = await run(tools.proposeDeleteField, { id: FIELD_ID }, { toolCallId: "c6", context: { userId: USER, now: NOW } });
    expect(result).toMatchObject({ status: "awaiting_confirmation" });
    expect(approvals.propose).toHaveBeenCalledWith(expect.objectContaining({ type: "field.delete", payload: { id: FIELD_ID, fieldName: "Wheat near Lyon" } }));
  });

  it("without a signed-in user every field tool refuses and touches nothing", async () => {
    const { tools, fields, approvals } = fakes();
    const context = { now: NOW };
    expect(await run(tools.listFields, {}, { toolCallId: "c7", context })).toEqual({ error: "not_signed_in" });
    expect(await run(tools.proposeSaveField, { name: "Corn", lat: 1, lon: 1 }, { toolCallId: "c8", context })).toEqual({ error: "not_signed_in" });
    expect(fields.list).not.toHaveBeenCalled();
    expect(approvals.propose).not.toHaveBeenCalled();
  });
});
