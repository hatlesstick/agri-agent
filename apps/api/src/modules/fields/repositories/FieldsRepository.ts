import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { DATABASE, isUniqueViolation, type DatabaseHandle } from "@/database";
import { fields } from "@/database/schema";
import { FieldNameTakenError, type Field, type FieldPatch, type NewField } from "@/modules/fields/fields.types";

const NAME_UNIQUE = "fields_user_id_name_unique";

@Injectable()
export class FieldsRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async create(userId: string, input: NewField): Promise<Field> {
    try {
      const [field] = await this.database.get().insert(fields).values({ ...input, userId }).returning();
      return field;
    } catch (error) {
      if (isUniqueViolation(error, NAME_UNIQUE)) throw new FieldNameTakenError(input.name);
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
      .where(and(eq(fields.userId, userId), eq(sql`lower(${fields.name})`, name.trim().toLowerCase())))
      .limit(1);
    return field ?? null;
  }

  async update(userId: string, fieldId: string, patch: FieldPatch): Promise<Field | null> {
    try {
      const [field] = await this.database
        .get()
        .update(fields)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(fields.userId, userId), eq(fields.id, fieldId)))
        .returning();
      return field ?? null;
    } catch (error) {
      if (patch.name && isUniqueViolation(error, NAME_UNIQUE)) throw new FieldNameTakenError(patch.name);
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
