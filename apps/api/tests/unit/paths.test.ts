import { existsSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { INDEX_FILE } from "@/modules/rag/DocsRepository";
import { DATA_DIR } from "@/paths";

describe("DATA_DIR", () => {
  it("points at apps/api/data with the RAG corpus", () => {
    expect(DATA_DIR.endsWith(`apps${sep}api${sep}data`)).toBe(true);
    expect(readdirSync(join(DATA_DIR, "docs")).filter((file) => file.endsWith(".md"))).toHaveLength(6);
  });

  it("holds the RAG index used by DocsRepository", () => {
    expect(existsSync(join(DATA_DIR, "index.json"))).toBe(true);
    expect(INDEX_FILE).toBe(join(DATA_DIR, "index.json"));
  });
});
