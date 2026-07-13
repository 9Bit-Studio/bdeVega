import { ArrowRight, Gamepad2, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const steps = [
  ["01", "Describe it", "Write the game idea in plain language."],
  ["02", "Shape it", "Choose the style, controls, and challenge."],
  ["03", "Play it", "Get a tested game you can refine and share."],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <a href="#" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Gamepad2 className="size-4" />
          </span>
          Vega Forge
        </a>
        <Button asChild variant="ghost"><Link href="/home">Sign in</Link></Button>
      </nav>

      <section className="mx-auto grid min-h-[70vh] w-full max-w-6xl items-center gap-16 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-primary">
            <Sparkles className="size-4" /> Prompt. Test. Play.
          </p>
          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.96] tracking-[-0.06em] sm:text-7xl">
            Your game idea, playable in one shot.
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
            Describe a world, choose how it should feel, and Vega Forge builds it on a tested game engine—not a pile of generated code.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/create">Start building <ArrowRight className="size-4" /></Link>
            </Button>
            <Button size="lg" variant="outline">Explore templates</Button>
          </div>
        </div>

        <div className="relative aspect-[4/5] rounded-[2rem] border border-border bg-card p-4 shadow-2xl shadow-black/40">
          <div className="grid h-full place-items-center overflow-hidden rounded-[1.4rem] border border-white/5 bg-[radial-gradient(circle_at_50%_35%,#3c2017_0%,#1a1014_38%,#0b090d_72%)]">
            <div className="text-center">
              <div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_50px_rgba(255,107,74,0.2)]">
                <Gamepad2 className="size-9" />
              </div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Engine preview</p>
              <p className="mt-2 text-xl font-medium">Playable demo coming online</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
        {steps.map(([number, title, body]) => (
          <article key={number} className="bg-background p-8">
            <p className="font-mono text-xs text-primary">{number}</p>
            <h2 className="mt-8 text-xl font-medium">{title}</h2>
            <p className="mt-2 leading-7 text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
