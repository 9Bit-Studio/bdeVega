import type { ExpectationAssertion } from "@vega/spec";

export function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

export function assertionPasses(
  assertion: ExpectationAssertion,
  beforeState: unknown,
  afterState: unknown,
): boolean {
  const before = readPath(beforeState, assertion.path);
  const after = readPath(afterState, assertion.path);

  switch (assertion.operator) {
    case "changed":
      return !Object.is(before, after);
    case "increased":
      return typeof before === "number" && typeof after === "number" && after > before;
    case "decreased":
      return typeof before === "number" && typeof after === "number" && after < before;
    case "equals":
      return Object.is(after, assertion.value);
    case "greater-than":
      return typeof after === "number" && typeof assertion.value === "number" && after > assertion.value;
    case "less-than":
      return typeof after === "number" && typeof assertion.value === "number" && after < assertion.value;
    case "truthy":
      return Boolean(after);
  }
}
