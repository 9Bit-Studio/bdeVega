import { describe, expect, it } from "vitest";
import { validateGameSpec } from "@vega/spec";

import { genreQuestionBanks, genreSpecs, getGenreSpec } from "./index.js";

describe("genre templates", () => {
  it("ships exactly the three v1 genres", () => {
    expect(Object.keys(genreSpecs).sort()).toEqual([
      "endless-runner",
      "platformer",
      "top-down-collector",
    ]);
  });

  it.each(Object.entries(genreSpecs))("validates the %s default", (_genre, spec) => {
    expect(validateGameSpec(spec).success).toBe(true);
  });

  it("returns a safe clone instead of mutable shared state", () => {
    const first = getGenreSpec("platformer");
    const second = getGenreSpec("platformer");

    first.meta.title = "Changed locally";

    expect(second.meta.title).toBe("Skyline Sprint");
  });

  it("provides questions with valid defaults for every genre", () => {
    for (const questions of Object.values(genreQuestionBanks)) {
      expect(questions.length).toBeGreaterThanOrEqual(3);
      for (const question of questions) {
        expect(question.options).toContain(question.defaultOption);
      }
    }
  });
});
