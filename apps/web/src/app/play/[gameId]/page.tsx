"use client";

import { GameRoot } from "@vega/engine";
import { validateGameSpecForEngine } from "@vega/spec";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function decodeVerificationSpec(value: string): unknown {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export default function PlayPage() {
  const params = useParams<{ gameId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [hashChecked, setHashChecked] = useState(false);
  const [verificationSpec, setVerificationSpec] = useState<unknown | null>(null);
  useEffect(() => {
    const encoded = new URLSearchParams(window.location.hash.slice(1)).get("verifySpec");
    if (encoded) {
      try {
        setVerificationSpec(decodeVerificationSpec(encoded));
      } catch {
        setVerificationSpec({});
      }
    }
    setHashChecked(true);
  }, []);
  const current = useQuery(api.games.getCurrent, hashChecked && verificationSpec === null && isAuthenticated
    ? { gameId: params.gameId as Id<"games"> }
    : "skip");

  if (!hashChecked) return <main className="play-loading">Loading game…</main>;
  if (verificationSpec !== null) {
    const parsed = validateGameSpecForEngine(verificationSpec);
    if (!parsed.success) return <main className="play-loading">This verification spec is invalid or unsupported.</main>;
    return <main className="play-page"><GameRoot spec={parsed.data} /></main>;
  }

  if (authLoading || !isAuthenticated || current === undefined) return <main className="play-loading">Loading game…</main>;
  if (!current) return <main className="play-loading">Game not found.</main>;
  const parsed = validateGameSpecForEngine(current.version.spec);
  if (!parsed.success) return <main className="play-loading">This game version requests engine features that are invalid or unsupported.</main>;

  return <main className="play-page"><GameRoot key={current.version._id} spec={parsed.data} /></main>;
}
