import type { z } from "zod";

import { gameSpecSchema, type GameSpec } from "./schema.js";

export interface GameSpecRepairContext {
  attempt: number;
  candidate: unknown;
  issues: z.core.$ZodIssue[];
}

export interface GameSpecRepairResult {
  repairAttempts: number;
  spec: GameSpec;
}

export interface GameSpecRepairOptions {
  candidate: unknown;
  maxAttempts?: number;
  repair: (context: GameSpecRepairContext) => Promise<unknown>;
}

export class GameSpecRepairError extends Error {
  constructor(
    public readonly issues: z.core.$ZodIssue[],
    public readonly repairAttempts: number,
  ) {
    const fields = issues.slice(0, 5).map((issue) => issue.path.join(".") || "root").join(", ");
    super(`Game spec is still invalid after ${repairAttempts} repair attempts. Fix these fields: ${fields}`);
    this.name = "GameSpecRepairError";
  }
}

export async function validateGameSpecWithRepair({
  candidate,
  maxAttempts = 2,
  repair,
}: GameSpecRepairOptions): Promise<GameSpecRepairResult> {
  let current = candidate;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    const result = gameSpecSchema.safeParse(current);
    if (result.success) {
      return { repairAttempts: attempt, spec: result.data };
    }

    if (attempt < maxAttempts) {
      current = await repair({ attempt: attempt + 1, candidate: current, issues: result.error.issues });
    }
  }

  const finalResult = gameSpecSchema.safeParse(current);
  if (finalResult.success) return { repairAttempts: maxAttempts, spec: finalResult.data };
  throw new GameSpecRepairError(finalResult.error.issues, maxAttempts);
}
