export type ModelPrice = { inputUsdPerToken: number; outputUsdPerToken: number };

export const PRICES_CHECKED_ON = "2026-11-12";

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "google/gemini-2.5-flash-lite": { inputUsdPerToken: 0.0000001, outputUsdPerToken: 0.0000004 },
  "openai/gpt-5.4-nano": { inputUsdPerToken: 0.0000002, outputUsdPerToken: 0.00000125 },
  "amazon/nova-lite": { inputUsdPerToken: 0.00000006, outputUsdPerToken: 0.00000024 },
  "amazon/nova-2-lite": { inputUsdPerToken: 0.00000033, outputUsdPerToken: 0.00000275 },
  "amazon/nova-micro": { inputUsdPerToken: 0.000000035, outputUsdPerToken: 0.00000014 },
};

export const COMPARISON_MODELS = ["google/gemini-2.5-flash-lite", "openai/gpt-5.4-nano", "amazon/nova-lite", "amazon/nova-2-lite"] as const;

export function estimateCostUsd(model: string, inputTokens: number | undefined, outputTokens: number | undefined): number | undefined {
  const price = MODEL_PRICES[model];
  if (!price || inputTokens === undefined || outputTokens === undefined) return undefined;
  return inputTokens * price.inputUsdPerToken + outputTokens * price.outputUsdPerToken;
}
