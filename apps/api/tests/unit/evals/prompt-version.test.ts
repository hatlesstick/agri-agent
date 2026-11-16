import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INSTRUCTIONS_PATH, promptVersion } from "@tests/evals/support/prompt-version";

describe("promptVersion", () => {
  it("returns the short hash of the last commit that touched the agent instructions", () => {
    expect(promptVersion()).toMatch(/^[0-9a-f]{7,}$/);
  });

  it("points at the instructions file that exists today", () => {
    expect(existsSync(INSTRUCTIONS_PATH)).toBe(true);
  });
});
