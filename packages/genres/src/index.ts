import type { GameGenre, GameSpec } from "@vega/spec";

import { endlessRunnerSpec } from "./endless-runner.js";
import { platformerSpec } from "./platformer.js";
import { topDownCollectorSpec } from "./top-down-collector.js";

export { endlessRunnerSpec } from "./endless-runner.js";
export { platformerSpec } from "./platformer.js";
export { genreQuestionBanks, getQuestionsForPrompt, type GenreQuestion } from "./questions.js";
export { topDownCollectorSpec } from "./top-down-collector.js";

export const genreSpecs: Record<GameGenre, GameSpec> = {
  platformer: platformerSpec,
  "endless-runner": endlessRunnerSpec,
  "top-down-collector": topDownCollectorSpec,
};

export function getGenreSpec(genre: GameGenre): GameSpec {
  return structuredClone(genreSpecs[genre]);
}
