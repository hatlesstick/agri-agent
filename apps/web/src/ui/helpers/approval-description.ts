import type { PendingAction } from "@agri/shared/contracts";

export const KIND_LABEL_KEYS = {
  save: "approval.kind.save",
  update: "approval.kind.update",
  delete: "approval.kind.delete",
} as const;

export const FIELD_LABEL_KEYS = {
  id: "approval.field.id",
  name: "approval.field.name",
  crop: "approval.field.crop",
  lat: "approval.field.lat",
  lon: "approval.field.lon",
  areaHa: "approval.field.areaHa",
  notes: "approval.field.notes",
} as const;

export type ApprovalKind = keyof typeof KIND_LABEL_KEYS;
export type ApprovalFieldKey = keyof typeof FIELD_LABEL_KEYS;
export type ApprovalField = { key: ApprovalFieldKey; value: string };
export type ApprovalDescription = { kind: ApprovalKind; fields: ApprovalField[]; unsafe: boolean };

export const CLEARED = "—";

const PATCH_KEYS = ["name", "crop", "lat", "lon", "areaHa", "notes"] as const satisfies readonly ApprovalFieldKey[];

function plainText(value: unknown): string | null {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return null;
}

export function describeApproval(action: PendingAction): ApprovalDescription | null {
  const payload = action.payload;
  const fieldName = plainText(payload.fieldName);
  if (action.type === "field.save") {
    const rows: ApprovalField[] = [];
    for (const key of PATCH_KEYS) {
      const value = plainText(payload[key]);
      if (value !== null && value !== "") rows.push({ key, value });
    }
    return { kind: "save", fields: rows, unsafe: false };
  }
  if (action.type === "field.update") {
    const patch = typeof payload.patch === "object" && payload.patch !== null ? (payload.patch as Record<string, unknown>) : {};
    const rows: ApprovalField[] = [{ key: "name", value: fieldName ?? String(payload.id ?? "") }];
    let unsafe = false;
    for (const [key, value] of Object.entries(patch)) {
      if (!(PATCH_KEYS as readonly string[]).includes(key)) {
        unsafe = true;
        continue;
      }
      const text = plainText(value);
      rows.push({ key: key as ApprovalFieldKey, value: text === null || text === "" ? CLEARED : text });
    }
    return { kind: "update", fields: rows, unsafe };
  }
  if (action.type === "field.delete") {
    return { kind: "delete", fields: [{ key: "name", value: fieldName ?? String(payload.id ?? "") }], unsafe: false };
  }
  return null;
}
