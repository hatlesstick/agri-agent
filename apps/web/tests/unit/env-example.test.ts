import { describe, expect, it } from "vitest";
import { envExampleFindings } from "@agri/shared/testing";

const WEB_ENV_KEYS = ["API_ORIGIN", "PROXY_AUTH_SECRET"];

describe("apps/web .env.example", () => {
  it("lists the web env variables and every variable read in code, with no secret values", () => {
    expect(envExampleFindings({ root: process.cwd(), requiredKeys: WEB_ENV_KEYS, sourceDirs: ["src", "tests"] })).toEqual({
      missingRequired: [],
      missingReadInCode: [],
      filledSecrets: [],
    });
  });
});
