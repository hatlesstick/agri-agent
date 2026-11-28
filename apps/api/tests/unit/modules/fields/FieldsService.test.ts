import { describe, expect, it } from "vitest";
import { FieldsService } from "@/modules/fields/FieldsService";
import type { FieldsRepository } from "@/modules/fields/repositories/FieldsRepository";
import type { Field } from "@/modules/fields/fields.types";

const ROW: Field = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "u",
  name: "Wheat near Lyon",
  crop: "wheat",
  lat: 45.76,
  lon: 4.84,
  areaHa: "12.50",
  notes: null,
  createdAt: new Date("2026-11-28T10:00:00.000Z"),
  updatedAt: new Date("2026-11-28T10:00:00.000Z"),
};

describe("FieldsService.list", () => {
  it("returns the user's fields with area as a number and dates as ISO strings", async () => {
    const repository = { list: async (userId: string) => (userId === "u" ? [ROW] : []) } as unknown as FieldsRepository;
    const result = await new FieldsService(repository).list("u");
    expect(result).toEqual({
      fields: [
        { id: ROW.id, name: "Wheat near Lyon", crop: "wheat", lat: 45.76, lon: 4.84, areaHa: 12.5, notes: null, createdAt: "2026-11-28T10:00:00.000Z" },
      ],
    });
  });

  it("keeps a missing area as null", async () => {
    const repository = { list: async () => [{ ...ROW, areaHa: null }] } as unknown as FieldsRepository;
    const result = await new FieldsService(repository).list("u");
    expect(result.fields[0].areaHa).toBeNull();
  });
});
