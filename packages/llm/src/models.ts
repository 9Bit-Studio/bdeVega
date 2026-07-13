import type { LLMProvider, ModelTier } from "./types.js";

export const modelMap: Record<LLMProvider, Record<ModelTier, string>> = {
  openai: { fast: "gpt-4o-mini", strong: "gpt-4.1" },
  anthropic: { fast: "claude-3-5-haiku-latest", strong: "claude-sonnet-4-6" },
  gemini: { fast: "gemini-3.1-flash-lite", strong: "gemini-3.5-flash" },
};

export function resolveModel(
  provider: LLMProvider,
  tier: ModelTier,
  devModelTier = false,
): string {
  return modelMap[provider][devModelTier ? "fast" : tier];
}
