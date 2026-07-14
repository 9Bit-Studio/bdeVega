import type { LLMProvider, ModelTier } from "./types.js";

export const modelMap: Record<LLMProvider, Record<ModelTier, string>> = {
  openai: { fast: "gpt-4o-mini", strong: "gpt-4.1" },
  anthropic: { fast: "claude-haiku-4-5", strong: "claude-sonnet-4-6" },
  gemini: { fast: "gemini-3.1-flash-lite", strong: "gemini-3.5-flash" },
};

export function resolveModel(
  provider: LLMProvider,
  tier: ModelTier,
  devModelTier = false,
): string {
  return modelMap[provider][devModelTier ? "fast" : tier];
}

// Standard API prices per million tokens, verified against provider pricing on 2026-07-14.
const modelPricesPerMillionTokens: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5 },
  "gemini-3.5-flash": { input: 1.5, output: 9 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = modelPricesPerMillionTokens[model];
  if (!price) return 0;
  return Number(((inputTokens * price.input + outputTokens * price.output) / 1_000_000).toFixed(8));
}
