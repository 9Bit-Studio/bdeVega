"use client";

import { GameRoot } from "@vega/engine";
import { validateGameSpec } from "@vega/spec";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";

export default function PlayPage() {
  const params = useParams<{ gameId: string }>();
  const current = useQuery(api.games.getCurrent, { gameId: params.gameId as Id<"games"> });

  if (current === undefined) return <main className="play-loading">Loading game…</main>;
  if (!current) return <main className="play-loading">Game not found.</main>;
  const parsed = validateGameSpec(current.version.spec);
  if (!parsed.success) return <main className="play-loading">This game version has an invalid spec.</main>;

  return <main className="play-page"><GameRoot key={current.version._id} spec={parsed.data} /></main>;
}
