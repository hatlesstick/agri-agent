import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { INDEX_FILE } from "@/docs/DocsRepository";
import { DATA_DIR, resolveDataDir } from "@/paths";

describe("DATA_DIR", () => {
  it("points at the package data folder with the RAG corpus", () => {
    expect(readdirSync(join(DATA_DIR, "docs")).filter((file) => file.endsWith(".md"))).toHaveLength(6);
  });

  it("holds the RAG index used by DocsRepository", () => {
    expect(existsSync(join(DATA_DIR, "index.json"))).toBe(true);
    expect(INDEX_FILE).toBe(join(DATA_DIR, "index.json"));
  });
});

describe("resolveDataDir", () => {
  it("defaults to the package data folder when no override is set", () => {
    expect(resolveDataDir(undefined)).toBe(DATA_DIR);
    expect(resolveDataDir("")).toBe(DATA_DIR);
  });

  it("resolves an override against the working directory", () => {
    expect(resolveDataDir("../../packages/agent/data")).toBe(resolve(process.cwd(), "../../packages/agent/data"));
    expect(resolveDataDir("/srv/rag")).toBe("/srv/rag");
  });
});
