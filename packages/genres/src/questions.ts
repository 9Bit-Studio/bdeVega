import type { GameGenre } from "@vega/spec";
import { getGenreCatalogEntry } from "./catalog.js";

export interface GenreQuestion {
  id: string;
  prompt: string;
  options: string[];
  defaultOption: string;
}

const sharedQuestions: GenreQuestion[] = [
  {
    id: "theme",
    prompt: "How should the world look?",
    options: ["neon", "pastel", "voxel", "retro", "realistic"],
    defaultOption: "neon",
  },
  {
    id: "difficulty",
    prompt: "How challenging should the first run feel?",
    options: ["relaxed", "balanced", "demanding"],
    defaultOption: "balanced",
  },
];

export const genreQuestionBanks: Record<GameGenre, GenreQuestion[]> = {
  platformer: [
    ...sharedQuestions,
    {
      id: "jump-style",
      prompt: "Which jump style feels right?",
      options: ["single jump", "floaty jump"],
      defaultOption: "single jump",
    },
  ],
  "precision-platformer": [...sharedQuestions, { id: "precision-focus", prompt: "What should precision emphasize?", options: ["tight landings", "hazard timing", "moving platforms"], defaultOption: "tight landings" }],
  "obstacle-course": [...sharedQuestions, { id: "course-focus", prompt: "What should define the course?", options: ["moving platforms", "checkpoint race", "hazard gauntlet"], defaultOption: "moving platforms" }],
  "endless-runner": [
    ...sharedQuestions,
    {
      id: "runner-controls",
      prompt: "How should lane movement work?",
      options: ["smooth steering", "three fixed lanes"],
      defaultOption: "smooth steering",
    },
  ],
  "arcade-racer": [...sharedQuestions, { id: "race-focus", prompt: "What should make the race exciting?", options: ["time trial", "hazard route", "score gates"], defaultOption: "time trial" }],
  "top-down-collector": [
    ...sharedQuestions,
    {
      id: "win-condition",
      prompt: "What should end the round?",
      options: ["collect everything", "beat the timer", "reach a score"],
      defaultOption: "collect everything",
    },
  ],
  "score-attack": [...sharedQuestions, { id: "score-focus", prompt: "How should players build score?", options: ["collectible chains", "bonus gates", "risky routes"], defaultOption: "collectible chains" }],
  "maze-escape": [
    ...sharedQuestions,
    {
      id: "maze-style",
      prompt: "What should make the maze interesting?",
      options: ["hazards and checkpoints", "score gates", "a relaxed scenic route"],
      defaultOption: "hazards and checkpoints",
    },
  ],
  "puzzle-escape": [...sharedQuestions, { id: "puzzle-focus", prompt: "What should the puzzle route use?", options: ["switch gates", "checkpoint order", "score locks"], defaultOption: "switch gates" }],
  "dungeon-escape": [...sharedQuestions, { id: "dungeon-focus", prompt: "What should fill the dungeon?", options: ["hazards", "treasure route", "checkpoint chambers"], defaultOption: "hazards" }],
  "survival-dodge": [...sharedQuestions, { id: "survival-focus", prompt: "How should survival pressure build?", options: ["dense hazards", "risky collectibles", "long escape route"], defaultOption: "dense hazards" }],
  exploration: [...sharedQuestions, { id: "exploration-focus", prompt: "What should reward exploration?", options: ["landmarks", "collectibles", "hidden routes"], defaultOption: "landmarks" }],
};

export function getQuestionsForPrompt(genre: GameGenre, prompt: string): GenreQuestion[] {
  const normalized = prompt.toLowerCase();
  const questions = genreQuestionBanks[genre].map((question) => ({
    ...question,
    options: [...question.options],
  }));
  const dimensions = getGenreCatalogEntry(genre).dimensions;
  questions.unshift({
    id: "dimension",
    prompt: "Should this game be 2D, 2.5D, or 3D?",
    options: dimensions,
    defaultOption: dimensions.includes("3d") ? "3d" : dimensions[0],
  });

  if (/space|galaxy|astronaut|zero[- ]gravity/.test(normalized)) {
    questions.push({
      id: "gravity",
      prompt: "How should movement feel in this space setting?",
      options: ["normal gravity", "low gravity", "zero gravity"],
      defaultOption: normalized.includes("zero") ? "zero gravity" : "low gravity",
    });
  }

  if (/underwater|ocean|sea|submarine/.test(normalized)) {
    questions.push({
      id: "underwater-goal",
      prompt: "What should the player focus on underwater?",
      options: ["rescue creatures", "find treasure", "survive the current"],
      defaultOption: "find treasure",
    });
  }

  return questions;
}
