import type { GameGenre, GameSpec } from "@vega/spec";

import { endlessRunnerSpec } from "./endless-runner.js";
import { platformerSpec } from "./platformer.js";
import { topDownCollectorSpec } from "./top-down-collector.js";
import { mazeEscapeSpec } from "./maze-escape.js";

export { endlessRunnerSpec } from "./endless-runner.js";
export { platformerSpec } from "./platformer.js";
export { mazeEscapeSpec } from "./maze-escape.js";
export { genreQuestionBanks, getQuestionsForPrompt, type GenreQuestion } from "./questions.js";
export { topDownCollectorSpec } from "./top-down-collector.js";
export { genreCatalog, getGenreCatalogEntry, unsupportedSinglePlayerGenres, type GenreCatalogEntry, type GenreDimension } from "./catalog.js";
export { createArtGenerationPlan, isMultiplayerPrompt, type ArtGenerationPlan } from "./art.js";

function variant(base: GameSpec, genre: GameGenre, title: string, description: string, mutate?: (spec: GameSpec) => void): GameSpec {
  const spec = structuredClone(base);
  spec.meta = { ...spec.meta, genre, title, description };
  mutate?.(spec);
  return spec;
}

export const genreSpecs: Record<GameGenre, GameSpec> = {
  platformer: platformerSpec,
  "precision-platformer": variant(platformerSpec, "precision-platformer", "Glassline Ascent", "Cross a demanding sequence of precise jumps and hazards.", (spec) => {
    spec.player.speed = 6;
    spec.player.jumpForce = 7.5;
    spec.world.mode = "2d";
  }),
  "obstacle-course": variant(platformerSpec, "obstacle-course", "Kinetic Trial", "Clear moving platforms, checkpoints, and a readable obstacle route.", (spec) => {
    spec.world.mode = "3d";
    spec.camera.type = "follow";
  }),
  "endless-runner": endlessRunnerSpec,
  "arcade-racer": variant(endlessRunnerSpec, "arcade-racer", "Neon Time Trial", "Race a fast checkpoint route and reach the finish beacon.", (spec) => {
    spec.world.mode = "3d";
    spec.player.speed = 10;
  }),
  "top-down-collector": topDownCollectorSpec,
  "score-attack": variant(topDownCollectorSpec, "score-attack", "Prism Score Rush", "Chain collectibles and score gates in a compact arcade arena.", (spec) => {
    spec.rules.timer = 90;
  }),
  "maze-escape": mazeEscapeSpec,
  "puzzle-escape": variant(mazeEscapeSpec, "puzzle-escape", "Switchroom", "Activate declarative score switches and find the exit.", (spec) => {
    spec.world.mode = "2d";
  }),
  "dungeon-escape": variant(mazeEscapeSpec, "dungeon-escape", "Ember Vault", "Navigate dungeon hazards, claim a checkpoint, and escape.", (spec) => {
    spec.world.theme = "retro";
  }),
  "survival-dodge": variant(topDownCollectorSpec, "survival-dodge", "Pulse Survivor", "Dodge hazards while collecting enough energy to finish the run.", (spec) => {
    spec.rules.timer = null;
    spec.level.entities.push({ id: "survival-exit", type: "goal", positions: [[14, 0.8, 14]] });
  }),
  exploration: variant(topDownCollectorSpec, "exploration", "Atlas Grove", "Explore a scenic world, discover landmarks, and reach the final beacon.", (spec) => {
    spec.rules.timer = null;
    spec.level.entities.push({ id: "discovery-exit", type: "goal", positions: [[14, 0.8, 14]] });
  }),
};

export function getGenreSpec(genre: GameGenre): GameSpec {
  return structuredClone(genreSpecs[genre]);
}
