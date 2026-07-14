import type { z } from "zod";

import { gameSpecSchema, type GameSpec } from "./schema.js";
import { assessEngineCapabilities, type EngineCapabilityIssue } from "./capabilities.js";

export type GameSpecValidationResult =
  | { success: true; data: GameSpec }
  | { success: false; issues: z.core.$ZodIssue[] };

export type EngineGameSpecValidationResult =
  | { success: true; data: GameSpec; warnings: EngineCapabilityIssue[] }
  | { success: false; issues: z.core.$ZodIssue[] | EngineCapabilityIssue[] };

export function validateGameSpec(input: unknown): GameSpecValidationResult {
  const result = gameSpecSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, issues: result.error.issues };
}

export function parseGameSpec(input: unknown): GameSpec {
  return gameSpecSchema.parse(input);
}

export function validateGameSpecForEngine(input: unknown): EngineGameSpecValidationResult {
  const parsed = validateGameSpec(input);
  if (!parsed.success) return parsed;

  const capabilityIssues = assessEngineCapabilities(parsed.data);
  const errors = capabilityIssues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) return { success: false, issues: errors };

  return {
    success: true,
    data: parsed.data,
    warnings: capabilityIssues.filter((issue) => issue.severity === "warning"),
  };
}
