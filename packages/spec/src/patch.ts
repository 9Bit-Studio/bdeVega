import { z } from "zod";

import { gameSpecSchema, type GameSpec } from "./schema.js";

const patchValueSchema = z.unknown().nullable();

export const specPatchOperationSchema = z.object({
  op: z.enum(["add", "replace", "remove"]),
  path: z.string().regex(/^\/(?!\/).+/, "Use a JSON Pointer path such as /player/speed"),
  value: patchValueSchema,
});

export const gameSpecPatchSchema = z.object({
  operations: z.array(specPatchOperationSchema).min(1).max(32),
});

export const gameSpecPatchJsonSchema = z.toJSONSchema(gameSpecPatchSchema, {
  target: "draft-2020-12",
});

export type GameSpecPatch = z.infer<typeof gameSpecPatchSchema>;

const forbiddenRoots = new Set(["assets", "schemaVersion"]);
const dangerousSegments = new Set(["__proto__", "prototype", "constructor"]);

function decodePointer(path: string): string[] {
  return path
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

export function applyGameSpecPatch(base: GameSpec, input: unknown): GameSpec {
  const patch = gameSpecPatchSchema.parse(input);
  const candidate = structuredClone(base) as unknown as Record<string, unknown>;

  for (const operation of patch.operations) {
    const segments = decodePointer(operation.path);
    if (forbiddenRoots.has(segments[0])) {
      throw new Error(`Refinement cannot change /${segments[0]}`);
    }
    if (segments.some((segment) => dangerousSegments.has(segment))) {
      throw new Error(`Unsafe refinement path: ${operation.path}`);
    }

    let parent: unknown = candidate;
    for (const segment of segments.slice(0, -1)) {
      if (Array.isArray(parent)) {
        const index = Number(segment);
        if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
          throw new Error(`Refinement path does not exist: ${operation.path}`);
        }
        parent = parent[index];
      } else if (parent && typeof parent === "object" && Object.hasOwn(parent, segment)) {
        parent = (parent as Record<string, unknown>)[segment];
      } else {
        throw new Error(`Refinement path does not exist: ${operation.path}`);
      }
    }

    const key = segments.at(-1)!;
    if (Array.isArray(parent)) {
      if (operation.op === "add" && key === "-") {
        parent.push(operation.value);
        continue;
      }
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
        throw new Error(`Refinement array index is invalid: ${operation.path}`);
      }
      if (operation.op === "remove") parent.splice(index, 1);
      else parent[index] = operation.value;
      continue;
    }

    if (!parent || typeof parent !== "object") {
      throw new Error(`Refinement path does not target an object: ${operation.path}`);
    }
    const object = parent as Record<string, unknown>;
    if (!Object.hasOwn(object, key)) {
      throw new Error(`Refinement path does not exist: ${operation.path}`);
    }
    if (operation.op === "remove") delete object[key];
    else object[key] = operation.value;
  }

  return gameSpecSchema.parse(candidate);
}
