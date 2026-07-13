import { getGenreSpec } from "@vega/genres";
import type { GameGenre } from "@vega/spec";

import { SpecPreview } from "@/components/spec-preview";

interface SpecDevPageProps {
  searchParams: Promise<{ genre?: string; seed?: string }>;
}

export default async function SpecDevPage({ searchParams }: SpecDevPageProps) {
  const params = await searchParams;
  const supported: GameGenre[] = ["platformer", "endless-runner", "top-down-collector"];
  const genre = supported.includes(params.genre as GameGenre) ? params.genre as GameGenre : "platformer";
  const seed = Number(params.seed ?? 1);
  const spec = getGenreSpec(genre);
  spec.meta.title = `Fuzz ${genre} ${seed}`;
  spec.player.speed = Math.max(3, Math.min(14, spec.player.speed + (seed % 7) - 3));
  spec.camera.smoothing = Math.max(0.03, Math.min(0.25, spec.camera.smoothing + (seed % 4) * 0.02));

  return <SpecPreview spec={spec} />;
}
