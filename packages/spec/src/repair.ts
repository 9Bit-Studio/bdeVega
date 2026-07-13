import type { z } from "zod";

import { gameSpecSchema, type GameSpec } from "./schema.js";

export interface GameSpecRepairContext {
  attempt: number;
  candidate: unknown;
  issues: z.core.$ZodIssue[];
}

export interface GameSpecRepairResult {
  defaulted: boolean;
  repairAttempts: number;
  spec: GameSpec;
}

export interface GameSpecRepairOptions {
  candidate: unknown;
  fallback: GameSpec;
  maxAttempts?: number;
  repair: (context: GameSpecRepairContext) => Promise<unknown>;
}

export async function validateGameSpecWithRepair({
  candidate,
  fallback,
  maxAttempts = 2,
  repair,
}: GameSpecRepairOptions): Promise<GameSpecRepairResult> {
  let current = candidate;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    const result = gameSpecSchema.safeParse(current);
    if (result.success) {
      return { defaulted: false, repairAttempts: attempt, spec: result.data };
    }

    if (attempt < maxAttempts) {
      current = await repair({ attempt: attempt + 1, candidate: current, issues: result.error.issues });
    }
  }

  return {
    defaulted: true,
    repairAttempts: maxAttempts,
    spec: gameSpecSchema.parse(fallback),
  };
}
