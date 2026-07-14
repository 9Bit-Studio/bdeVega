"use client";

import { motion } from "framer-motion";
import { Gem, Layers, Mountain, Play, Zap } from "lucide-react";
import Link from "next/link";

const GENRE_META: Record<string, { label: string; icon: typeof Mountain; from: string; to: string }> = {
  platformer: { label: "Platformer", icon: Mountain, from: "#ff6b4a", to: "#8a2f4f" },
  "endless-runner": { label: "Endless Runner", icon: Zap, from: "#ffb347", to: "#b0522a" },
  "top-down-collector": { label: "Collector", icon: Gem, from: "#ff8f6b", to: "#5c2a52" },
};

export interface GameCardData {
  _id: string;
  title: string;
  genre: string;
  plays: number;
  versionCount: number;
}

export function GameCard({ game }: { game: GameCardData }) {
  const meta = GENRE_META[game.genre] ?? { label: game.genre, icon: Layers, from: "#ff6b4a", to: "#3d2038" };
  const Icon = meta.icon;

  return (
    <Link
      href={`/games/${game._id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="card-lift relative aspect-video overflow-hidden rounded-xl border border-border group-hover:border-primary/40">
        {/* Procedural cover stands in until engine thumbnails are captured */}
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
          style={{ backgroundImage: `radial-gradient(120% 140% at 20% 10%, ${meta.from}55 0%, transparent 55%), linear-gradient(140deg, ${meta.from}33 0%, #16131a 60%, ${meta.to}44 100%)` }}
        >
          <Icon className="absolute right-4 top-4 size-6 opacity-60" style={{ color: meta.from }} />
          <span className="absolute bottom-3 left-4 font-display text-lg font-bold tracking-tight text-foreground/25">
            {game.title.slice(0, 24)}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-background/85 backdrop-blur-sm transition-transform duration-200 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0">
          <span className="flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-primary">
            <Play className="size-4 fill-current" /> Play
          </span>
        </div>
      </div>
      <div className="px-1 pt-3">
        <h3 className="truncate font-display text-base font-semibold tracking-tight">{game.title}</h3>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-accent">{meta.label}</span>
          <span>{game.plays} {game.plays === 1 ? "play" : "plays"}</span>
          <span aria-hidden>·</span>
          <span>{game.versionCount} {game.versionCount === 1 ? "version" : "versions"}</span>
        </p>
      </div>
    </Link>
  );
}

export function GameCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-video rounded-xl" />
      <div className="px-1 pt-3">
        <div className="skeleton h-4 w-2/3 rounded-md" />
        <div className="skeleton mt-2 h-3 w-1/2 rounded-md" />
      </div>
    </div>
  );
}

export function GameGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

export function EmptyGames({ title = "No games yet — let’s fix that" }: { title?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center"
    >
      <span className="text-4xl" aria-hidden>🕹️</span>
      <h2 className="mt-4 font-display text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Describe an idea and get a playable game in minutes.</p>
      <motion.span whileTap={{ scale: 0.96 }} className="mt-6 inline-block">
        <Link
          href="/create"
          className="card-lift inline-flex items-center gap-2 rounded-xl gradient-warm px-5 py-2.5 font-display font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          ＋ Create a game
        </Link>
      </motion.span>
    </motion.div>
  );
}
