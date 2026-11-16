import { describe, expect, it } from "vitest";
import { SERVER_ENV_KEYS } from "@agri/shared/server-env";
import { envExampleFindings } from "@agri/shared/testing";

describe("apps/web .env.example", () => {
  it("lists every server env variable and every variable read in code, with no secret values", () => {
    expect(envExampleFindings({ root: process.cwd(), requiredKeys: SERVER_ENV_KEYS, sourceDirs: ["src", "scripts", "tests"] })).toEqual({
      missingRequired: [],
      missingReadInCode: [],
      filledSecrets: [],
    });
  });
});
