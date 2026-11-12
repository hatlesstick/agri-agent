import { describe, expect, it } from "vitest";
import { COMPARISON_MODELS, estimateCostUsd, MODEL_PRICES } from "@tests/evals/model-pricing";

describe("estimateCostUsd", () => {
  it("multiplies tokens by the per-token price of the model", () => {
    expect(estimateCostUsd("google/gemini-2.5-flash-lite", 1_000_000, 1_000_000)).toBeCloseTo(0.5, 10);
    expect(estimateCostUsd("amazon/nova-lite", 2000, 100)).toBeCloseTo(2000 * 0.00000006 + 100 * 0.00000024, 12);
  });

  it("returns undefined for unknown models, mock runs or missing tokens", () => {
    expect(estimateCostUsd("mock", 100, 10)).toBeUndefined();
    expect(estimateCostUsd("unknown/model", 100, 10)).toBeUndefined();
    expect(estimateCostUsd("amazon/nova-lite", undefined, 10)).toBeUndefined();
  });

  it("has a price for every comparison model, including Amazon Bedrock models", () => {
    expect(COMPARISON_MODELS.filter((model) => !MODEL_PRICES[model])).toEqual([]);
    expect(COMPARISON_MODELS.some((model) => model.startsWith("amazon/"))).toBe(true);
  });
});
