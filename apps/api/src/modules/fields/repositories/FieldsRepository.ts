import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { DATABASE, isUniqueViolation, type DatabaseHandle } from "@/database";
import { fields } from "@/database/schema";
import { FieldNameTakenError, type Field, type FieldPatch, type NewField } from "@/modules/fields/fields.types";

const NAME_UNIQUE = "fields_user_id_name_unique";

const WRITABLE: Array<keyof NewField> = ["name", "crop", "lat", "lon", "areaHa", "notes"];

function writable(input: FieldPatch): FieldPatch {
  const values: FieldPatch = {};
  for (const key of WRITABLE) {
    if (input[key] !== undefined) Object.assign(values, { [key]: input[key] });
  }
  if (typeof values.name === "string") values.name = values.name.trim();
  return values;
}

@Injectable()
export class FieldsRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async create(userId: string, input: NewField): Promise<Field> {
    try {
      const [field] = await this.database
        .get()
        .insert(fields)
        .values({ ...(writable(input) as NewField), userId })
        .returning();
      return field;
    } catch (error) {
      if (isUniqueViolation(error, NAME_UNIQUE)) throw new FieldNameTakenError(input.name.trim());
      throw error;
    }
  }

  list(userId: string): Promise<Field[]> {
    return this.database.get().select().from(fields).where(eq(fields.userId, userId)).orderBy(asc(fields.createdAt), asc(fields.name));
  }

  async getById(userId: string, fieldId: string): Promise<Field | null> {
    const [field] = await this.database.get().select().from(fields).where(and(eq(fields.userId, userId), eq(fields.id, fieldId))).limit(1);
    return field ?? null;
  }

  async findByName(userId: string, name: string): Promise<Field | null> {
    const [field] = await this.database
      .get()
      .select()
      .from(fields)
      .where(and(eq(fields.userId, userId), eq(sql`lower(btrim(${fields.name}))`, name.trim().toLowerCase())))
      .limit(1);
    return field ?? null;
  }

  async update(userId: string, fieldId: string, patch: FieldPatch): Promise<Field | null> {
    try {
      const [field] = await this.database
        .get()
        .update(fields)
        .set({ ...writable(patch), updatedAt: new Date() })
        .where(and(eq(fields.userId, userId), eq(fields.id, fieldId)))
        .returning();
      return field ?? null;
    } catch (error) {
      if (patch.name && isUniqueViolation(error, NAME_UNIQUE)) throw new FieldNameTakenError(patch.name.trim());
      throw error;
    }
  }

  async delete(userId: string, fieldId: string): Promise<boolean> {
    const deleted = await this.database
      .get()
      .delete(fields)
      .where(and(eq(fields.userId, userId), eq(fields.id, fieldId)))
      .returning({ id: fields.id });
    return deleted.length > 0;
  }
}
