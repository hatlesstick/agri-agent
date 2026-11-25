import { describe, expect, it } from "vitest";
import { validateDocument } from "@/modules/rag/domain/validate-document";

const VALID = "# Spray drift\n\nSource: FAO 2001\nUpdated: 2026-11-25\n\n## Factors\n\nWind.";

describe("validateDocument", () => {
  it("returns title, source and update date for a complete document", () => {
    expect(validateDocument(VALID)).toEqual({
      title: "Spray drift",
      source: "FAO 2001",
      updatedAt: "2026-11-25",
    });
  });

  it("rejects a document without a title line", () => {
    expect(validateDocument("Source: FAO\nUpdated: 2026-11-25\n\n## S\n\ntext")).toEqual({ error: "missing_title" });
  });

  it("rejects a document without a source line", () => {
    expect(validateDocument("# T\nUpdated: 2026-11-25\n\n## S\n\ntext")).toEqual({ error: "missing_source" });
  });

  it("rejects a document without an update date", () => {
    expect(validateDocument("# T\nSource: FAO\n\n## S\n\ntext")).toEqual({ error: "missing_updated" });
  });

  it("rejects an update date that is not a real calendar date", () => {
    expect(validateDocument("# T\nSource: FAO\nUpdated: 2026-13-45\n\n## S\n\ntext")).toEqual({ error: "invalid_updated" });
    expect(validateDocument("# T\nSource: FAO\nUpdated: 25.11.2026\n\n## S\n\ntext")).toEqual({ error: "invalid_updated" });
  });
});
