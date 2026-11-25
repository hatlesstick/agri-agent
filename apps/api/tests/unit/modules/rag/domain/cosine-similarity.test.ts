import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "ai";

describe("cosineSimilarity from the AI SDK (contract rankChunks relies on)", () => {
  it("is 1 for the same direction, 0 for orthogonal and -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("returns 0 for empty or zero vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it("throws for vectors of different lengths (an index built with another embedding model)", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/same length/);
  });
});
