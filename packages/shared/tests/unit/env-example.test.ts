import { describe, expect, it } from "vitest";
import { envExampleFindings } from "@/testing/env-example";

describe("packages/shared .env.example", () => {
  it("lists every env variable read in this package and holds no secret values", () => {
    expect(envExampleFindings({ root: process.cwd(), requiredKeys: [], sourceDirs: ["src"] })).toEqual({
      missingRequired: [],
      missingReadInCode: [],
      filledSecrets: [],
    });
  });
});
