import type { GameGenre, GameSpec } from "@vega/spec";

export type GenreDimension = GameSpec["world"]["mode"];

export interface GenreCatalogEntry {
  id: GameGenre;
  label: string;
  family: "platformer" | "runner" | "topdown";
  dimensions: GenreDimension[];
  artKeywords: string[];
}

export const genreCatalog: GenreCatalogEntry[] = [
  { id: "platformer", label: "Platformer", family: "platformer", dimensions: ["2d", "2.5d", "3d"], artKeywords: ["readable platforms", "hero silhouette", "layered world"] },
  { id: "precision-platformer", label: "Precision Platformer", family: "platformer", dimensions: ["2d", "2.5d"], artKeywords: ["high contrast hazards", "crisp geometry", "precise landing zones"] },
  { id: "obstacle-course", label: "Obstacle Course", family: "platformer", dimensions: ["2.5d", "3d"], artKeywords: ["bold obstacles", "kinetic course", "clear route markers"] },
  { id: "endless-runner", label: "Endless Runner", family: "runner", dimensions: ["2d", "2.5d", "3d"], artKeywords: ["fast parallax", "speed lines", "clear lanes"] },
  { id: "arcade-racer", label: "Arcade Racer", family: "runner", dimensions: ["2.5d", "3d"], artKeywords: ["racing track", "speed signage", "vivid checkpoints"] },
  { id: "top-down-collector", label: "Collector", family: "topdown", dimensions: ["2d", "3d"], artKeywords: ["collectible landmarks", "open arena", "friendly navigation"] },
  { id: "score-attack", label: "Score Attack", family: "topdown", dimensions: ["2d", "3d"], artKeywords: ["arcade arena", "score gates", "high-energy palette"] },
  { id: "maze-escape", label: "Maze Escape", family: "topdown", dimensions: ["2d", "3d"], artKeywords: ["labyrinth walls", "exit beacon", "navigation landmarks"] },
  { id: "puzzle-escape", label: "Puzzle Escape", family: "topdown", dimensions: ["2d", "3d"], artKeywords: ["switches and gates", "visual logic", "mysterious chamber"] },
  { id: "dungeon-escape", label: "Dungeon Escape", family: "topdown", dimensions: ["2d", "3d"], artKeywords: ["dungeon corridors", "hazard readability", "glowing exit"] },
  { id: "survival-dodge", label: "Survival Dodge", family: "topdown", dimensions: ["2d", "3d"], artKeywords: ["danger arena", "safe space contrast", "incoming threats"] },
  { id: "exploration", label: "Exploration", family: "topdown", dimensions: ["2d", "3d"], artKeywords: ["scenic landmarks", "inviting paths", "discovery points"] },
];

export const unsupportedSinglePlayerGenres = Object.freeze([
  "action-rpg",
  "turn-based-rpg",
  "first-person-shooter",
  "third-person-shooter",
  "real-time-strategy",
  "tower-defense",
  "life-simulation",
  "sports-simulation",
  "rhythm",
] as const);

export function getGenreCatalogEntry(genre: GameGenre): GenreCatalogEntry {
  const entry = genreCatalog.find((candidate) => candidate.id === genre);
  if (!entry) throw new Error(`Unknown genre: ${genre}`);
  return entry;
}
