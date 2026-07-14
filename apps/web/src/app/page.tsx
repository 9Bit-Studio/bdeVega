"use client";

import { motion } from "framer-motion";
import { ArrowRight, Gamepad2, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { SessionProvider, useSession } from "@/components/app/session-provider";

const IDEA_CHIPS = [
  "A marshmallow knight bouncing between clouds",
  "A cat courier racing across neon rooftops",
  "A firefly lighting up a dark meadow",
  "A tiny UFO abducting garden gnomes",
];

const steps = [
  ["01", "Describe it", "Write the game idea in plain language."],
  ["02", "Shape it", "Choose the style, controls, and challenge."],
  ["03", "Play it", "Get a tested game you can refine and share."],
];

function Landing() {
  const { session, ready } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (ready && session) router.replace("/create");
  }, [ready, session, router]);

  const go = (text: string) => {
    try {
      window.sessionStorage.setItem("vega.draftPrompt", text.trim());
    } catch {
      // storage unavailable — the create page just starts blank
    }
    router.push("/create");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    go(prompt);
  };

  if (!ready || session) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-30%] mx-auto h-[70vh] w-[120vw] rounded-[50%] opacity-40 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(255,107,74,0.55), rgba(255,170,80,0.18), transparent)" }}
      />

      <nav className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl gradient-warm text-primary-foreground">
            <Gamepad2 className="size-5" />
          </span>
          Vega Forge
        </span>
        <Link
          href="/create"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in
        </Link>
      </nav>

      <section className="relative mx-auto flex min-h-[72vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-primary"
        >
          <Sparkles className="size-4" /> Prompt. Test. Play.
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl"
        >
          What are we <span className="gradient-warm-text">building</span> today?
        </motion.h1>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 24 }}
          className="mt-9 w-full rounded-3xl border border-border bg-card/80 p-3 shadow-2xl shadow-primary/10 backdrop-blur-md transition-colors focus-within:border-primary/60"
        >
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                go(prompt);
              }
            }}
            rows={3}
            placeholder="A platformer where a slime prince bounces through a jelly castle…"
            aria-label="Describe your game"
            className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-left text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="hidden text-xs text-muted-foreground sm:block">Free to try — create an account in seconds</span>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.96 }}
              className="ml-auto flex items-center gap-2 rounded-2xl gradient-warm px-5 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Wand2 className="size-4" /> Make my game <ArrowRight className="size-4" />
            </motion.button>
          </div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          {IDEA_CHIPS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => go(idea)}
              className="card-lift rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {idea}
            </button>
          ))}
        </motion.div>
      </section>

      <section className="relative mx-auto mb-16 grid w-full max-w-6xl gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
        {steps.map(([number, title, body]) => (
          <article key={number} className="group bg-background/90 p-8 transition-colors hover:bg-card/80">
            <p className="font-mono text-xs text-primary">{number}</p>
            <h2 className="mt-8 font-display text-xl font-semibold">{title}</h2>
            <p className="mt-2 leading-7 text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <SessionProvider>
      <Landing />
    </SessionProvider>
  );
}
