import { fieldsListSchema, type FieldsList } from "@agri/shared/contracts";

export const fieldKeys = {
  list: ["fields", "list"] as const,
};

export async function fetchFields(): Promise<FieldsList> {
  const response = await fetch("/api/fields", { cache: "no-store" });
  if (!response.ok) throw new Error(`fields request failed: ${response.status}`);
  return fieldsListSchema.parse(await response.json());
}
