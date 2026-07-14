"use client";

import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../../convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Globe2, LoaderCircle, Lock, Send, UploadCloud, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const spring = { type: "spring" as const, stiffness: 420, damping: 30 };

export default function GamePlayerPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId as Id<"games">;
  const current = useQuery(api.games.getCurrent, { gameId });
  const refineGame = useAction(api.generation.refine);
  const publishGame = useAction(api.publish.publishToVercel);
  const setPublic = useMutation(api.games.setPublic);
  const recordPlay = useMutation(api.games.recordPlay);

  const [refinement, setRefinement] = useState("");
  const [busy, setBusy] = useState<"refine" | "publish" | null>(null);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorded = useRef(false);

  useEffect(() => {
    if (!recorded.current && current) {
      recorded.current = true;
      void recordPlay({ gameId });
    }
  }, [current, gameId, recordPlay]);

  const refine = async (event: FormEvent) => {
    event.preventDefault();
    if (!refinement.trim()) return;
    setBusy("refine");
    setError(null);
    try {
      await refineGame({ gameId, request: refinement.trim() });
      setRefinement("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Refinement failed");
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    setBusy("publish");
    setError(null);
    try {
      const result = await publishGame({ gameId });
      setPublishUrl(result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  if (current === undefined) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="skeleton aspect-video rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }
  if (current === null) {
    return <div className="grid flex-1 place-items-center text-muted-foreground">Game not found.</div>;
  }

  const { game, version, publishedUrl } = current;
  const verify = version.verifyResult as { pass?: boolean; pending?: boolean; failures?: { message?: string }[] } | undefined;
  const generation = version.generation as {
    costUsd?: number;
    latencyMs?: number;
    model?: string;
    validation?: { attempts?: number; repaired?: boolean; success?: boolean };
  } | undefined;
  const verifying = Boolean(verify?.pending) || busy === "refine";

  const checklist: { label: string; state: "done" | "active" | "failed" }[] = [
    { label: "Game spec compiled", state: "done" },
    { label: `Version ${version.version} saved`, state: "done" },
    verifying
      ? { label: "Playtesting in the engine…", state: "active" }
      : verify?.pass
        ? { label: "Playtest passed", state: "done" }
        : { label: "Playtest found issues", state: "failed" },
  ];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div className={`overflow-hidden rounded-2xl border bg-[#0b090d] transition-shadow duration-500 ${verifying ? "glow-coral border-primary/50" : "border-border"}`}>
          <iframe
            key={version._id}
            src={publishedUrl ?? `/play/${gameId}`}
            title={game.title}
            sandbox="allow-scripts allow-pointer-lock allow-same-origin"
            data-testid="app-game-iframe"
            className="aspect-video w-full"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 px-1">
          <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-bold tracking-tight">{game.title}</h1>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-accent">{game.genre}</span>
          {publishedUrl ? <span className="rounded-full border border-accent/30 px-3 py-1 text-xs font-medium text-accent">Hosted on Vercel</span> : null}
          <button
            type="button"
            onClick={() => setPublic({ gameId, isPublic: !game.isPublic })}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={game.isPublic}
          >
            {game.isPublic ? <Globe2 className="size-3.5 text-accent" /> : <Lock className="size-3.5" />}
            {game.isPublic ? "Public" : "Private"}
          </button>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Build log</h2>
          <ul className="mt-4 grid gap-2.5">
            <AnimatePresence initial={false}>
              {checklist.map((item, index) => (
                <motion.li
                  key={`${item.label}-${item.state}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: index * 0.08 }}
                  className="flex items-center gap-2.5 text-sm"
                >
                  {item.state === "done" ? (
                    <Check className="size-4 shrink-0 text-accent" />
                  ) : item.state === "active" ? (
                    <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <X className="size-4 shrink-0 text-primary" />
                  )}
                  {item.label}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {!verifying && verify?.failures?.length ? (
            <ul className="mt-3 grid gap-1.5 border-t border-border pt-3">
              {verify.failures.slice(0, 4).map((failure, index) => (
                <li key={index} className="text-xs text-muted-foreground">{failure.message ?? "Unknown issue"}</li>
              ))}
            </ul>
          ) : null}
          {generation ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              <dt>Model</dt><dd className="truncate text-right">{generation.model ?? "unknown"}</dd>
              <dt>Generation</dt><dd className="text-right">{generation.latencyMs ?? 0} ms</dd>
              <dt>Cost</dt><dd className="text-right">${(generation.costUsd ?? 0).toFixed(6)}</dd>
              <dt>Validation</dt><dd className="text-right">{generation.validation?.success ? "Passed" : "Failed"}{generation.validation?.repaired ? ` after ${generation.validation.attempts} attempts` : ""}</dd>
            </dl>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Refine</h2>
          <form onSubmit={refine} className="mt-4 grid gap-2.5">
            <textarea
              value={refinement}
              onChange={(event) => setRefinement(event.target.value)}
              rows={3}
              placeholder="Make it faster, add double jump, set it at night…"
              aria-label="Refinement request"
              data-testid="app-refine-input"
              className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            />
            <motion.button
              type="submit"
              disabled={busy !== null || !refinement.trim()}
              whileTap={{ scale: 0.96 }}
              data-testid="app-refine-submit"
              className="flex h-10 items-center justify-center gap-2 rounded-xl gradient-warm text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy === "refine" ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              {busy === "refine" ? "Rebuilding…" : "Refine game"}
            </motion.button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Share</h2>
          <motion.button
            type="button"
            onClick={publish}
            disabled={busy !== null}
            whileTap={{ scale: 0.96 }}
            data-testid="app-publish-submit"
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold transition-colors hover:border-primary/50 disabled:opacity-50"
          >
            {busy === "publish" ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
            Publish
          </motion.button>
          {publishUrl ? (
            <code className="mt-3 block truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs text-accent" data-testid="app-publish-url">{publishUrl}</code>
          ) : null}
        </section>

        {error ? <p className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary" role="alert">{error}</p> : null}
      </aside>
    </div>
  );
}
