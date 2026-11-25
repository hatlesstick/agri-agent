import { readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { DATA_DIR } from "@/config/data-dir";

describe("DATA_DIR", () => {
  it("points at apps/api/data with the RAG corpus", () => {
    expect(DATA_DIR.endsWith(`apps${sep}api${sep}data`)).toBe(true);
    expect(readdirSync(join(DATA_DIR, "docs")).filter((file) => file.endsWith(".md"))).toHaveLength(6);
  });

});
