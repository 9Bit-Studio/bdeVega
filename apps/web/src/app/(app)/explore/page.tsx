"use client";

import { api } from "../../../../../../convex/_generated/api";
import { useQuery } from "convex/react";

import { EmptyGames, GameCard, GameCardSkeleton, GameGrid } from "@/components/app/game-card";

export default function ExplorePage() {
  const games = useQuery(api.games.listPublic, {});

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Explore</h1>
      <p className="mt-1 text-sm text-muted-foreground">Public games from the community.</p>
      <div className="mt-8">
        {!games ? (
          <GameGrid>{Array.from({ length: 8 }, (_, index) => <GameCardSkeleton key={index} />)}</GameGrid>
        ) : games.length === 0 ? (
          <EmptyGames title="Nothing public yet — share one of yours" />
        ) : (
          <GameGrid>{games.map((game) => <GameCard key={game._id} game={game} />)}</GameGrid>
        )}
      </div>
    </div>
  );
}
