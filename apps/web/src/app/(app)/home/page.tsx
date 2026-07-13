"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { useSession } from "@/components/app/session-provider";

export default function HomePage() {
  const { session } = useSession();
  const firstName = session?.name.split(/\s+/)[0] ?? "there";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        <Sparkles className="size-3.5" /> Ready when you are
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Hey {firstName}, what are we <span className="gradient-warm-text">playing</span> today?
      </h1>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Create a game <ArrowRight className="size-3.5" />
        </Link>
        <Link
          href="/games"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          My games
        </Link>
      </div>
    </div>
  );
}
