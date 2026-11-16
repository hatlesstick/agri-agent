import { describe, expect, it } from "vitest";
import { z } from "zod";
import { cityNameSchema } from "@/agent/tools/shared/schemas";

describe("cityNameSchema", () => {
  it.each(["Lyon", "Kraków", "Saint-Étienne", "Bad Tölz", "L'Aquila", "Łódź", "Đà Nẵng", "Zürich"])("accepts the Latin-script name %s", (name) => {
    expect(cityNameSchema.safeParse(name).success).toBe(true);
  });

  it.each(["Луцьк", "東京", "Αθήνα", "123", "-Lyon", ""])("rejects %s", (name) => {
    expect(cityNameSchema.safeParse(name).success).toBe(false);
  });

  it("exposes a JSON Schema pattern every provider accepts (no Unicode property escapes)", () => {
    const pattern = (z.toJSONSchema(cityNameSchema) as { pattern?: string }).pattern ?? "";

    expect(pattern).not.toBe("");
    expect(pattern).not.toContain("\\p{");
  });
});
