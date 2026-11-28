import { Inject, Injectable } from "@nestjs/common";
import type { Field as FieldContract, FieldsList } from "@agri/shared/contracts";
import { FIELDS_REPOSITORY } from "@/modules/fields/fields.tokens";
import type { Field } from "@/modules/fields/fields.types";
import type { FieldsRepository } from "@/modules/fields/repositories/FieldsRepository";

function view(row: Field): FieldContract {
  return {
    id: row.id,
    name: row.name,
    crop: row.crop,
    lat: row.lat,
    lon: row.lon,
    areaHa: row.areaHa === null ? null : Number(row.areaHa),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class FieldsService {
  constructor(@Inject(FIELDS_REPOSITORY) private readonly fields: FieldsRepository) {}

  async list(userId: string): Promise<FieldsList> {
    const rows = await this.fields.list(userId);
    return { fields: rows.map(view) };
  }
}
