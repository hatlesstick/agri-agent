import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SERVER_ENV_KEYS } from "@/shared/config/env";

const ROOT = process.cwd();
const RUNTIME_ONLY_KEYS = new Set(["NODE_ENV", "NEXT_RUNTIME", "CI_OFFLINE", "EVAL_COMPARE", "EVAL_RUN_ID"]);
const SECRET_KEY = /(_KEY|_SECRET|_TOKEN|_PASSWORD)$/;

function exampleEntries(): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of readFileSync(join(ROOT, ".env.example"), "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) entries.set(match[1], match[2]);
  }
  return entries;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx|mts|mjs)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

function envKeysReadInCode(): Set<string> {
  const files = [...sourceFiles(join(ROOT, "src")), ...sourceFiles(join(ROOT, "scripts")), ...sourceFiles(join(ROOT, "tests"))];
  const keys = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) keys.add(match[1]);
  }
  return keys;
}

describe(".env.example", () => {
  const entries = exampleEntries();

  it("lists every server env variable", () => {
    const missing = SERVER_ENV_KEYS.filter((key) => !RUNTIME_ONLY_KEYS.has(key) && !entries.has(key));
    expect(missing).toEqual([]);
  });

  it("lists every env variable read directly in code", () => {
    const missing = [...envKeysReadInCode()].filter((key) => !RUNTIME_ONLY_KEYS.has(key) && !entries.has(key));
    expect(missing).toEqual([]);
  });

  it("never contains values for secrets", () => {
    const filled = [...entries].filter(([key, value]) => SECRET_KEY.test(key) && value.trim() !== "").map(([key]) => key);
    expect(filled).toEqual([]);
  });
});
