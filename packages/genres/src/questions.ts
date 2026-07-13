import type { GameGenre } from "@vega/spec";

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
      options: ["single jump", "double jump", "floaty jump"],
      defaultOption: "double jump",
    },
  ],
  "endless-runner": [
    ...sharedQuestions,
    {
      id: "runner-controls",
      prompt: "How should lane movement work?",
      options: ["smooth steering", "three fixed lanes"],
      defaultOption: "smooth steering",
    },
  ],
  "top-down-collector": [
    ...sharedQuestions,
    {
      id: "win-condition",
      prompt: "What should end the round?",
      options: ["collect everything", "beat the timer", "reach a score"],
      defaultOption: "collect everything",
    },
  ],
};
