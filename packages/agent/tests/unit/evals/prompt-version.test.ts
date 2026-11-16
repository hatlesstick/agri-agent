import { describe, expect, it } from "vitest";
import { promptVersion } from "@tests/evals/prompt-version";

describe("promptVersion", () => {
  it("returns the short hash of the last commit that touched the agent instructions", () => {
    expect(promptVersion()).toMatch(/^[0-9a-f]{7,}$/);
  });
});
