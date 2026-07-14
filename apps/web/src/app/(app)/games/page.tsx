"use client";

import { api } from "../../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { EmptyGames, GameCard, GameCardSkeleton, GameGrid } from "@/components/app/game-card";
import { useSession } from "@/components/app/session-provider";

export default function MyGamesPage() {
  return (
    <Suspense>
      <MyGames />
    </Suspense>
  );
}

function MyGames() {
  const { session } = useSession();
  const query = useSearchParams().get("q")?.toLowerCase() ?? "";
  const games = useQuery(api.games.listWithMeta, session ? {} : "skip");
  const filtered = games?.filter((game) => game.title.toLowerCase().includes(query));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">My Games</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {query ? <>Results for “{query}”</> : "Everything you’ve built so far."}
      </p>
      <div className="mt-8">
        {!filtered ? (
          <GameGrid>{Array.from({ length: 8 }, (_, index) => <GameCardSkeleton key={index} />)}</GameGrid>
        ) : filtered.length === 0 ? (
          <EmptyGames title={query ? `Nothing matches “${query}”` : undefined} />
        ) : (
          <GameGrid>{filtered.map((game) => <GameCard key={game._id} game={game} />)}</GameGrid>
        )}
      </div>
    </div>
  );
}
