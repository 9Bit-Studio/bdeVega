import type { z } from "zod";

import { gameSpecSchema, type GameSpec } from "./schema.js";

export type GameSpecValidationResult =
  | { success: true; data: GameSpec }
  | { success: false; issues: z.core.$ZodIssue[] };

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
