import { describe, expect, it } from "vitest";
import { normalizeVector } from "@/modules/rag/domain/normalize-vector";

function length(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

describe("normalizeVector", () => {
  it("scales a vector to length 1 and keeps its direction", () => {
    const normalized = normalizeVector([3, 4]);
    expect(normalized[0]).toBeCloseTo(0.6);
    expect(normalized[1]).toBeCloseTo(0.8);
    expect(length(normalized)).toBeCloseTo(1);
  });

  it("gives length 1 for a high-dimensional vector", () => {
    const vector = Array.from({ length: 1536 }, (_, index) => (index % 7) - 3);
    expect(length(normalizeVector(vector))).toBeCloseTo(1, 6);
  });

  it("refuses a zero vector, which has no direction", () => {
    expect(() => normalizeVector([0, 0, 0])).toThrow(/zero vector/);
  });
});
