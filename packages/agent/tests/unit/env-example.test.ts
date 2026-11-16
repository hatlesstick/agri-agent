import { describe, expect, it } from "vitest";
import { SERVER_ENV_KEYS } from "@agri/shared/server-env";
import { envExampleFindings } from "@agri/shared/testing";

const HTTP_ONLY_KEYS = new Set(["RATE_LIMIT_PER_MINUTE", "GLOBAL_RATE_LIMIT_PER_MINUTE", "TRUSTED_PROXY_HOPS"]);

describe("packages/agent .env.example", () => {
  it("lists every agent-side server env variable and every variable read in code, with no secret values", () => {
    const requiredKeys = SERVER_ENV_KEYS.filter((key) => !HTTP_ONLY_KEYS.has(key));
    expect(envExampleFindings({ root: process.cwd(), requiredKeys, sourceDirs: ["src", "scripts", "tests"] })).toEqual({
      missingRequired: [],
      missingReadInCode: [],
      filledSecrets: [],
    });
  });
});
