import { describe, expect, it } from "vitest";
import type { PendingAction } from "@agri/shared/contracts";
import { describeApproval } from "@/ui/helpers/approval-description";

const action = (type: string, payload: Record<string, unknown>): PendingAction => ({
  id: "11111111-1111-4111-8111-111111111111",
  type,
  status: "awaiting_confirmation",
  expiresAt: "2026-11-28T12:00:00.000Z",
  payload,
});

describe("describeApproval", () => {
  it("describes a field save with its name, crop and coordinates", () => {
    expect(describeApproval(action("field.save", { name: "Wheat", crop: "wheat", lat: 45.76, lon: 4.84 }))).toEqual({
      kind: "save",
      unsafe: false,
      fields: [
        { key: "name", value: "Wheat" },
        { key: "crop", value: "wheat" },
        { key: "lat", value: "45.76" },
        { key: "lon", value: "4.84" },
      ],
    });
  });

  it("names the field and shows the changed values", () => {
    const result = describeApproval(action("field.update", { id: "f1", fieldName: "Wheat", patch: { crop: "barley" } }));
    expect(result).toEqual({ kind: "update", unsafe: false, fields: [{ key: "name", value: "Wheat" }, { key: "crop", value: "barley" }] });
  });

  it("shows a cleared value explicitly instead of dropping it", () => {
    const result = describeApproval(action("field.update", { id: "f1", fieldName: "Wheat", patch: { notes: null } }));
    expect(result?.fields).toContainEqual({ key: "notes", value: "—" });
  });

  it("marks an update with an unknown key as unsafe", () => {
    const result = describeApproval(action("field.update", { id: "f1", fieldName: "Wheat", patch: { owner: "x" } }));
    expect(result?.unsafe).toBe(true);
  });

  it("describes a delete by the field name", () => {
    expect(describeApproval(action("field.delete", { id: "f1", fieldName: "Wheat" }))).toEqual({ kind: "delete", unsafe: false, fields: [{ key: "name", value: "Wheat" }] });
  });

  it("returns null for an action type this page does not know", () => {
    expect(describeApproval(action("something.else", {}))).toBeNull();
  });
});
