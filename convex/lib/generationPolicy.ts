import type { LLMProvider, ModelTier } from "@vega/llm";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

export const USER_GENERATION_LIMITS = {
  activeJobs: 2,
  jobsPerDay: 20,
  costUsdPerDay: 5,
} as const;

export const PROVIDER_GENERATION_LIMITS: Record<LLMProvider, {
  activeJobs: number;
  jobsPerMinute: number;
  jobsPerDay: number;
  costUsdPerDay: number;
}> = {
  openai: { activeJobs: 12, jobsPerMinute: 30, jobsPerDay: 500, costUsdPerDay: 100 },
  anthropic: { activeJobs: 8, jobsPerMinute: 20, jobsPerDay: 300, costUsdPerDay: 100 },
  gemini: { activeJobs: 20, jobsPerMinute: 60, jobsPerDay: 1_000, costUsdPerDay: 100 },
};

export function reservedGenerationCost(provider: LLMProvider, tier: ModelTier): number {
  const strongReservation: Record<LLMProvider, number> = {
    openai: 0.2,
    anthropic: 0.35,
    gemini: 0.35,
  };
  return tier === "strong" ? strongReservation[provider] : 0.08;
}

export function isActiveGenerationStatus(status: string): boolean {
  return status === "queued" || status === "running" || status === "retrying";
}

export function jobCost(job: { estimatedCostUsd: number; generation?: unknown }): number {
  const actual = (job.generation as { costUsd?: unknown } | undefined)?.costUsd;
  return typeof actual === "number" ? actual : job.estimatedCostUsd;
}
