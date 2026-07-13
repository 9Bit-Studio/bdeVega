"use client";

import { GameRoot } from "@vega/engine";
import type { GameSpec } from "@vega/spec";

interface SpecPreviewProps {
  spec: GameSpec;
}

export function SpecPreview({ spec }: SpecPreviewProps) {
  return <main className="play-page"><GameRoot spec={spec} /></main>;
}
