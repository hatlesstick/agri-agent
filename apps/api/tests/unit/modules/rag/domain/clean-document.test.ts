import { describe, expect, it } from "vitest";
import { cleanDocument } from "@/modules/rag/domain/clean-document";

describe("cleanDocument", () => {
  it("normalizes Unicode to NFC so the same text always hashes the same", () => {
    const decomposed = "Обробка ї трави".normalize("NFD");
    expect(decomposed).not.toBe("Обробка ї трави");
    expect(cleanDocument(decomposed)).toBe("Обробка ї трави");
  });

  it("converts Windows and old Mac line endings to LF", () => {
    expect(cleanDocument("# T\r\n\r\nSource: x\r\n")).toBe("# T\n\nSource: x");
    expect(cleanDocument("# T\r\rSource: x")).toBe("# T\n\nSource: x");
  });

  it("removes trailing spaces on every line", () => {
    expect(cleanDocument("# T  \n\nWind \t \nfine")).toBe("# T\n\nWind\nfine");
  });

  it("collapses runs of blank lines into one blank line", () => {
    expect(cleanDocument("# T\n\n\n\n## S\n\n\ntext")).toBe("# T\n\n## S\n\ntext");
  });

  it("trims leading and trailing whitespace of the whole document", () => {
    expect(cleanDocument("\n\n  # T\n\nSource: x\n\n")).toBe("# T\n\nSource: x");
  });

  it("returns the same text when it is already clean", () => {
    const clean = "# Title\n\nSource: FAO\n\n## One\n\nBody text.";
    expect(cleanDocument(clean)).toBe(clean);
  });
});
