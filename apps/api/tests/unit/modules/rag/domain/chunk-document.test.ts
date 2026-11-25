import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chunkDocument, CHUNK_OVERLAP, CHUNK_SIZE } from "@/modules/rag/domain/chunk-document";
import { chunkMarkdown } from "@/modules/rag/domain/chunk-markdown";

const DOCS_DIR = fileURLToPath(new URL("../../../../../data/docs", import.meta.url));
const SPRAY_DRIFT = "# Spray drift\n\nSource: FAO 2001\nUpdated: 2026-11-25\n\n## Main factors\n\nWind and droplet size.\n\n## Empty\n\n## Practical measures\n\nUse low pressure nozzles.";

function longBody(sentences: number): string {
  return Array.from({ length: sentences }, (_, index) => `Sentence number ${index + 1} describes one measure for drift.`).join(" ");
}

describe("chunkDocument", () => {
  it("produces one chunk per non-empty section, carrying title, source and update date", async () => {
    const result = await chunkDocument("spray-drift.md", SPRAY_DRIFT);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.chunks).toEqual([
      {
        id: "spray-drift.md#main-factors",
        source: "FAO 2001",
        title: "Spray drift",
        heading: "Main factors",
        updatedAt: "2026-11-25",
        text: "Spray drift — Main factors\n\nWind and droplet size.",
      },
      {
        id: "spray-drift.md#practical-measures",
        source: "FAO 2001",
        title: "Spray drift",
        heading: "Practical measures",
        updatedAt: "2026-11-25",
        text: "Spray drift — Practical measures\n\nUse low pressure nozzles.",
      },
    ]);
  });

  it("returns the same section boundaries and text as the current chunker on every corpus file", async () => {
    const files = readdirSync(DOCS_DIR).filter((file) => file.endsWith(".md"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const markdown = readFileSync(join(DOCS_DIR, file), "utf8");
      const current = chunkMarkdown(file, markdown);
      const result = await chunkDocument(file, markdown);
      expect("error" in result, file).toBe(false);
      if ("error" in result) continue;
      expect(
        result.chunks.map(({ id, source, title, heading, text }) => ({ id, source, title, heading, text })),
        file,
      ).toEqual(current);
    }
  });

  it("splits a section longer than the chunk size into overlapping parts with numbered ids", async () => {
    const markdown = `# Long topic\n\nSource: GRDC\nUpdated: 2026-11-25\n\n## Long section\n\n${longBody(60)}`;
    const result = await chunkDocument("long.md", markdown);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    const parts = result.chunks;
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.map((part) => part.id)).toEqual(parts.map((_, index) => `long.md#long-section-${index + 1}`));
    for (const part of parts) {
      expect(part.text.length).toBeLessThanOrEqual(CHUNK_SIZE + "Long topic — Long section\n\n".length);
      expect(part.heading).toBe("Long section");
    }
    const overlapStart = parts[1].text.replace("Long topic — Long section\n\n", "").slice(0, 40);
    expect(parts[0].text.includes(overlapStart)).toBe(true);
  });

  it("uses the 1000-character size with 15 percent overlap", () => {
    expect(CHUNK_SIZE).toBe(1000);
    expect(CHUNK_OVERLAP).toBe(150);
  });

  it("returns the validation error instead of chunks for an invalid document", async () => {
    expect(await chunkDocument("bad.md", "# T\n\n## S\n\ntext")).toEqual({ error: "missing_source" });
  });
});
