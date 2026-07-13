import { describe, expect, it } from "vitest";

import { assertionPasses, readPath } from "./assertions.js";

describe("verification assertions", () => {
  it("reads nested engine state", () => {
    expect(readPath({ playerPosition: { y: 4 } }, "playerPosition.y")).toBe(4);
  });

  it("detects movement increases", () => {
    expect(
      assertionPasses(
        { id: "jump", description: "Jump works", path: "playerPosition.y", operator: "increased" },
        { playerPosition: { y: 1 } },
        { playerPosition: { y: 3 } },
      ),
    ).toBe(true);
  });

  it("rejects an unmet equality assertion", () => {
    expect(
      assertionPasses(
        { id: "score", description: "Score changes", path: "score", operator: "equals", value: 10 },
        { score: 0 },
        { score: 5 },
      ),
    ).toBe(false);
  });
});
