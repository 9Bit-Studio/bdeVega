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

export function getQuestionsForPrompt(genre: GameGenre, prompt: string): GenreQuestion[] {
  const normalized = prompt.toLowerCase();
  const questions = genreQuestionBanks[genre].map((question) => ({
    ...question,
    options: [...question.options],
  }));

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

  if (/co-op|coop|multiplayer|two players|friends/.test(normalized)) {
    questions.push({
      id: "player-count",
      prompt: "How should the multiplayer moment work?",
      options: ["one shared hero", "two cooperative heroes", "take turns"],
      defaultOption: "two cooperative heroes",
    });
  }

  return questions;
}
