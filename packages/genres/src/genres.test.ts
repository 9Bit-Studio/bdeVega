import { describe, expect, it } from "vitest";
import { validateGameSpecForEngine } from "@vega/spec";

import { createArtGenerationPlan, genreCatalog, genreQuestionBanks, genreSpecs, getGenreSpec, getQuestionsForPrompt, isMultiplayerPrompt } from "./index.js";

describe("genre templates", () => {
  it("ships the capability-backed genre set", () => {
    expect(Object.keys(genreSpecs).sort()).toEqual(genreCatalog.map((entry) => entry.id).sort());
  });

  it("creates mode-aware art plans for every supported genre", () => {
    for (const spec of Object.values(genreSpecs)) {
      const plan = createArtGenerationPlan(spec, "An original game world");
      expect(plan.mode).toBe(spec.world.mode);
      expect(plan.playerPrompt).toContain("no copyrighted characters");
      expect(plan.environmentPrompt).toContain(spec.world.theme);
    }
  });

  it("detects multiplayer requests while allowing single-player prompts", () => {
    expect(isMultiplayerPrompt("a two player co-op dungeon")).toBe(true);
    expect(isMultiplayerPrompt("a single-player dungeon escape")).toBe(false);
  });

  it.each(Object.entries(genreSpecs))("validates the %s default", (_genre, spec) => {
    expect(validateGameSpecForEngine(spec).success).toBe(true);
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

  it("adds prompt-specific questions without mutating the shared bank", () => {
    const questions = getQuestionsForPrompt("platformer", "A zero gravity space rescue");

    expect(questions.map((question) => question.id)).toContain("gravity");
    expect(questions.find((question) => question.id === "gravity")?.defaultOption).toBe("zero gravity");
    expect(genreQuestionBanks.platformer.map((question) => question.id)).not.toContain("gravity");
  });
});
