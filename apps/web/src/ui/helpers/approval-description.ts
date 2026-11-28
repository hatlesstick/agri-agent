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
export type ApprovalDescription = { kind: ApprovalKind; fields: ApprovalField[] };

const FIELD_KEYS: ApprovalFieldKey[] = ["name", "crop", "lat", "lon", "areaHa", "notes"];

function text(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "number" ? String(value) : typeof value === "string" ? value : null;
}

function fieldRows(source: Record<string, unknown>): ApprovalField[] {
  const rows: ApprovalField[] = [];
  for (const key of FIELD_KEYS) {
    const value = text(source[key]);
    if (value !== null) rows.push({ key, value });
  }
  return rows;
}

export function describeApproval(action: PendingAction): ApprovalDescription | null {
  const payload = action.payload;
  if (action.type === "field.save") return { kind: "save", fields: fieldRows(payload) };
  if (action.type === "field.update") {
    const patch = typeof payload.patch === "object" && payload.patch !== null ? (payload.patch as Record<string, unknown>) : {};
    return { kind: "update", fields: [{ key: "id", value: String(payload.id ?? "") }, ...fieldRows(patch)] };
  }
  if (action.type === "field.delete") return { kind: "delete", fields: [{ key: "id", value: String(payload.id ?? "") }] };
  return null;
}
