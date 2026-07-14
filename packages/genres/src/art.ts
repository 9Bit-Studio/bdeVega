import type { GameSpec } from "@vega/spec";

import { getGenreCatalogEntry } from "./catalog.js";

export interface ArtGenerationPlan {
  mode: GameSpec["world"]["mode"];
  playerPrompt: string;
  environmentPrompt: string;
  style: string;
}

export function createArtGenerationPlan(spec: GameSpec, creatorPrompt: string): ArtGenerationPlan {
  const genre = getGenreCatalogEntry(spec.meta.genre);
  const dimensionLanguage = spec.world.mode === "2d"
    ? "polished 2D game art, clean silhouettes, production sprite readability"
    : spec.world.mode === "2.5d"
      ? "2.5D game art, dimensional lighting with side-view gameplay readability"
      : "stylized 3D game concept art, strong depth cues and readable gameplay landmarks";
  const style = `${spec.world.theme} ${genre.label.toLowerCase()}, ${dimensionLanguage}`;
  const shared = `${creatorPrompt}. ${genre.artKeywords.join(", ")}. Palette: ${spec.visuals.palette.join(", ")}. Original game art, no text, no logos, no copyrighted characters.`;
  return {
    mode: spec.world.mode,
    style,
    playerPrompt: `${shared} Create one centered full-body player character on a simple contrasting background. ${style}.`,
    environmentPrompt: `${shared} Create a wide gameplay environment plate with clear traversable space and no player character. ${style}.`,
  };
}

export function isMultiplayerPrompt(prompt: string): boolean {
  return /\b(multiplayer|co[- ]?op|pvp|pve|mmo|online match|two players|2 players|split screen)\b/i.test(prompt);
}
