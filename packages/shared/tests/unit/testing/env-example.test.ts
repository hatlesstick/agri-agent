import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { envExampleFindings } from "@/testing/env-example";

const roots: string[] = [];

function workspace(example: string, sources: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "env-example-"));
  roots.push(root);
  writeFileSync(join(root, ".env.example"), example);
  for (const [file, content] of Object.entries(sources)) {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

describe("envExampleFindings", () => {
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it("reports keys read in code but missing from .env.example", () => {
    const root = workspace("BAR=1\n", { "src/a.ts": "process.env.FOO; process.env.BAR;" });
    expect(envExampleFindings({ root, requiredKeys: [], sourceDirs: ["src"] }).missingReadInCode).toEqual(["FOO"]);
  });

  it("reports required keys missing from .env.example", () => {
    const root = workspace("BAR=1\n", { "src/a.ts": "" });
    expect(envExampleFindings({ root, requiredKeys: ["BAR", "BAZ"], sourceDirs: ["src"] }).missingRequired).toEqual(["BAZ"]);
  });

  it("reports secrets that have values", () => {
    const root = workspace("API_KEY=abc\nOTHER_TOKEN=\nPLAIN=x\n", { "src/a.ts": "" });
    expect(envExampleFindings({ root, requiredKeys: [], sourceDirs: ["src"] }).filledSecrets).toEqual(["API_KEY"]);
  });

  it("ignores runtime-only keys and missing source directories", () => {
    const root = workspace("", { "src/a.ts": "process.env.NODE_ENV; process.env.CI_OFFLINE;" });
    expect(envExampleFindings({ root, requiredKeys: ["NODE_ENV"], sourceDirs: ["src", "scripts"] })).toEqual({
      missingRequired: [],
      missingReadInCode: [],
      filledSecrets: [],
    });
  });
});
