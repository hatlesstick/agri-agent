import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY_RAW_PALETTE_FILES } from "../../../../eslint-rules/legacy-files.mjs";

const ROOT = join(__dirname, "../../../..");
const UI = join(ROOT, "src/ui");

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return files(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

export function inlineTextIn(source: string): string[] {
  return [...source.matchAll(/>([^<>{}\n]*\p{L}[^<>{}\n]*)</gu)].map((match) => match[1].trim()).filter(Boolean);
}

describe("no inline UI strings", () => {
  it("every visible JSX text comes from the dictionaries (legacy files excluded until migrated)", () => {
    const offenders = files(UI)
      .map((file) => ({ file: relative(ROOT, file), text: inlineTextIn(readFileSync(file, "utf8")) }))
      .filter(({ file }) => !LEGACY_RAW_PALETTE_FILES.includes(file))
      .filter(({ text }) => text.length > 0);
    expect(offenders).toEqual([]);
  });

  it("detects a literal in JSX text", () => {
    expect(inlineTextIn('export const A = () => <p>Hello there</p>;')).toEqual(["Hello there"]);
    expect(inlineTextIn("export const A = () => <p>{t('x')}</p>;")).toEqual([]);
  });
});
