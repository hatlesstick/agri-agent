import type { fields } from "@/database/schema";

export type Field = typeof fields.$inferSelect;

export type NewField = Pick<typeof fields.$inferInsert, "name" | "crop" | "lat" | "lon" | "areaHa" | "notes">;

export type FieldPatch = Partial<NewField>;

export class FieldNameTakenError extends Error {
  constructor(readonly fieldName: string) {
    super(`A field named "${fieldName}" already exists`);
    this.name = "FieldNameTakenError";
  }
}
