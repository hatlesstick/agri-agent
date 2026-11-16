import { describe, expect, it } from "vitest";
import { envExampleFindings } from "@agri/shared/testing";
import { API_ENV_KEYS } from "@/config";

describe("apps/api .env.example", () => {
  it("lists every API env variable and every variable read in code, with no secret values", () => {
    expect(envExampleFindings({ root: process.cwd(), requiredKeys: API_ENV_KEYS, sourceDirs: ["src", "scripts"] })).toEqual({
      missingRequired: [],
      missingReadInCode: [],
      filledSecrets: [],
    });
  });
});
