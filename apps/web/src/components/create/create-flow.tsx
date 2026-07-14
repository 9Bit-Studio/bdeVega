"use client";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Dices, Gem, KeyRound, LoaderCircle, Mountain, RotateCcw, Route, Sparkles, X, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { useSession } from "@/components/app/session-provider";
import { BackgroundStage } from "@/components/create/background-stage";
import { getQuestionsForPrompt } from "@vega/genres";
import type { GameGenre } from "@vega/spec";

type Genre = GameGenre;

const GENRES: { id: Genre; label: string; icon: typeof Mountain }[] = [
  { id: "platformer", label: "Platformer", icon: Mountain },
  { id: "precision-platformer", label: "Precision", icon: Mountain },
  { id: "obstacle-course", label: "Obstacle Course", icon: Mountain },
  { id: "endless-runner", label: "Endless Runner", icon: Zap },
  { id: "arcade-racer", label: "Arcade Racer", icon: Zap },
  { id: "top-down-collector", label: "Collector", icon: Gem },
  { id: "score-attack", label: "Score Attack", icon: Gem },
  { id: "maze-escape", label: "Maze Escape", icon: Route },
  { id: "puzzle-escape", label: "Puzzle Escape", icon: Route },
  { id: "dungeon-escape", label: "Dungeon Escape", icon: Route },
  { id: "survival-dodge", label: "Survival Dodge", icon: Zap },
  { id: "exploration", label: "Exploration", icon: Route },
];

const CHIP_PROMPTS: Record<Genre, string> = {
  platformer: "A cheerful platformer where a tiny robot hops across floating gardens collecting stars",
  "precision-platformer": "A precise 2D platformer through a crystal clockwork tower",
  "obstacle-course": "A 3D obstacle course with moving lifts and glowing checkpoints",
  "endless-runner": "An endless runner where a fox dashes through a glowing forest dodging thorn bushes",
  "arcade-racer": "A fast 3D arcade time trial through a neon canyon",
  "top-down-collector": "A top-down collector where a beachcomber crab gathers shells before the tide comes in",
  "score-attack": "A bright arcade arena where risky routes multiply the score",
  "maze-escape": "A neon maze escape where a courier activates checkpoints and avoids static fields",
  "puzzle-escape": "A mysterious switch puzzle with gates and an ancient exit beacon",
  "dungeon-escape": "A torchlit dungeon escape with traps, treasure, and checkpoints",
  "survival-dodge": "A survival arena where a tiny ship dodges energy storms",
  exploration: "A calm 3D exploration game about discovering luminous ruins",
};

const INSPIRE_PROMPTS = [
  "A pastel platformer about a marshmallow knight bouncing between clouds to rescue lost balloons",
  "An endless runner through neon city rooftops as a cat courier delivering midnight snacks",
  "A cozy collector game where a firefly lights up a dark meadow by gathering dewdrops",
  "A retro platformer set inside a giant arcade machine, jumping across circuit boards",
  "An endless runner down a volcano slope on a snowboard made of obsidian",
  "A top-down collector where a tiny UFO abducts garden gnomes before sunrise",
];

const PLACEHOLDERS = [
  "A platformer where a slime prince bounces through a jelly castle…",
  "An endless runner on the back of a giant friendly whale…",
  "A collector game about a magpie hoarding shiny buttons…",
  "A retro platformer set in a haunted vending machine…",
];

const THEME_SWATCHES: Record<string, string> = {
  neon: "linear-gradient(135deg, #16f7e0 0%, #1a0b2e 55%, #ff3df0 100%)",
  pastel: "linear-gradient(135deg, #ffd6e8 0%, #cdeaff 60%, #e8ffd6 100%)",
  voxel: "linear-gradient(135deg, #7ec850 0%, #5b3a29 60%, #9ad1ff 100%)",
  retro: "linear-gradient(135deg, #ff8f2b 0%, #2b1b4d 55%, #ffe15c 100%)",
  realistic: "linear-gradient(135deg, #6b7f8f 0%, #2e3d34 55%, #a3b899 100%)",
};

function inferGenre(prompt: string): Genre {
  const text = prompt.toLowerCase();
  if (/survival|survive|arena|dodge/.test(text)) return "survival-dodge";
  if (/race|racing|time trial/.test(text)) return "arcade-racer";
  if (/precision|hard platform/.test(text)) return "precision-platformer";
  if (/obstacle|obby|course/.test(text)) return "obstacle-course";
  if (/puzzle|switch|logic/.test(text)) return "puzzle-escape";
  if (/dungeon|crypt|vault/.test(text)) return "dungeon-escape";
  if (/runner|running|dash|endless/.test(text)) return "endless-runner";
  if (/explore|exploration|discover/.test(text)) return "exploration";
  if (/score|arcade/.test(text)) return "score-attack";
  if (/collect|gather|hoard|scaveng/.test(text)) return "top-down-collector";
  if (/maze|labyrinth|escape/.test(text)) return "maze-escape";
  return "platformer";
}

const spring = { type: "spring" as const, stiffness: 420, damping: 30 };

export function CreateFlow() {
  const { session } = useSession();
  const router = useRouter();
  const startGeneration = useMutation(api.generationJobs.start);
  const cancelGeneration = useMutation(api.generationJobs.cancel);
  const resumeGeneration = useMutation(api.generationJobs.resume);
  const settings = useQuery(api.settings.get, session ? {} : "skip");
  const keys = useQuery(api.apiKeys.listMasked, session ? {} : "skip");
  const reducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<"compose" | "questions" | "building">("compose");
  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [needsKey, setNeedsKey] = useState(false);
  const [genre, setGenre] = useState<Genre>("platformer");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [buildError, setBuildError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<Id<"generationJobs"> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const job = useQuery(api.generationJobs.get, jobId ? { jobId } : "skip");

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  // pick up a prompt drafted on the logged-out landing page
  useEffect(() => {
    try {
      const draft = window.sessionStorage.getItem("vega.draftPrompt");
      if (draft) {
        window.sessionStorage.removeItem("vega.draftPrompt");
        setPrompt((current) => current || draft);
      }
    } catch {
      // storage unavailable — start blank
    }
  }, []);

  useEffect(() => {
    if (job?.status === "succeeded" && job.gameId) router.push(`/games/${job.gameId}`);
  }, [job?.gameId, job?.status, router]);

  const questions = useMemo(() => getQuestionsForPrompt(genre, prompt), [genre, prompt]);
  const totalSteps = 1 + questions.length;

  const hasDefaultKey = keys === undefined || settings === undefined
    ? null
    : keys.some((key) => key.provider === settings.defaultProvider);

  const beginQuestions = () => {
    if (!prompt.trim()) {
      textareaRef.current?.focus();
      return;
    }
    if (hasDefaultKey === false) {
      setNeedsKey(true);
      return;
    }
    setNeedsKey(false);
    setGenre(inferGenre(prompt));
    setStep(0);
    setAnswers({});
    setPhase("questions");
  };

  const build = async (finalAnswers: Record<string, string>) => {
    if (!session) return;
    setPhase("building");
    setBuildError(null);
    try {
      const filled = Object.fromEntries(questions.map((question) => [question.id, finalAnswers[question.id] ?? question.defaultOption]));
      const result = await startGeneration({ prompt: prompt.trim(), genre, answers: filled });
      setJobId(result.jobId);
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : "Generation failed — try again");
      setPhase("questions");
    }
  };

  const answerCurrent = (value: string) => {
    if (step === 0) {
      setGenre(value as Genre);
      setStep(1);
      return;
    }
    const question = questions[step - 1];
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    if (step >= totalSteps - 1) void build(next);
    else setStep(step + 1);
  };

  const skipAll = () => void build(answers);

  const onPromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      beginQuestions();
    }
  };

  const inspire = () => {
    const next = INSPIRE_PROMPTS[Math.floor(Math.random() * INSPIRE_PROMPTS.length)];
    setPrompt(next);
    textareaRef.current?.focus();
  };

  const fillChip = (genreId: Genre | "surprise") => {
    if (genreId === "surprise") return inspire();
    setPrompt(CHIP_PROMPTS[genreId]);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <BackgroundStage />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          {phase === "compose" ? (
            <motion.div
              key="compose"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={spring}
            >
              <h1 className="text-center font-display text-4xl font-bold tracking-tight sm:text-6xl">
                What should we <span className="gradient-warm-text">build?</span>
              </h1>
              <p className="mt-3 text-center text-base text-muted-foreground">
                Describe a game in a sentence — we&apos;ll handle the engine, the art, and the playtesting.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2" role="list" aria-label="Idea starters">
                {GENRES.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    type="button"
                    role="listitem"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => fillChip(id)}
                    className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-4 text-accent" /> {label}
                  </motion.button>
                ))}
                <motion.button
                  type="button"
                  role="listitem"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => fillChip("surprise")}
                  className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Dices className="size-4" /> Surprise me
                </motion.button>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-md">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={onPromptKeyDown}
                  autoFocus
                  rows={3}
                  placeholder={PLACEHOLDERS[placeholderIndex]}
                  aria-label="Describe your game"
                  data-testid="create-prompt"
                  className="w-full resize-none bg-transparent text-base leading-7 outline-none placeholder:text-muted-foreground/70"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={inspire}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Sparkles className="size-4" /> Inspire me
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={beginQuestions}
                    data-testid="create-submit"
                    className="flex items-center gap-2 rounded-xl gradient-warm px-5 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Build my game <kbd className="rounded bg-black/20 px-1.5 font-sans text-xs">⏎</kbd>
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {needsKey ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={spring}
                    className="mt-4 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4"
                    role="status"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent"><KeyRound className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Add your API key first — takes 30 seconds</p>
                      <p className="text-xs text-muted-foreground">Vega Forge uses your own key to generate games. It stays encrypted on your machine.</p>
                    </div>
                    <Link
                      href="/settings"
                      className="shrink-0 rounded-xl border border-accent/50 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Open Settings
                    </Link>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : phase === "questions" ? (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={spring}
              className="flex gap-8"
            >
              <ProgressRail step={step} labels={["Genre", ...questions.map((question) => railLabel(question.id))]} />

              <div className="min-w-0 flex-1">
                {buildError ? <p className="mb-4 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary" role="alert">{buildError}</p> : null}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 32, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -24, scale: 0.98 }}
                    transition={{ ...spring, duration: 0.2 }}
                    className="rounded-2xl border border-border bg-card/85 p-6 backdrop-blur-md"
                  >
                    {step === 0 ? (
                      <QuestionCard title="Sound right?" subtitle={`This reads like a ${GENRES.find((entry) => entry.id === inferGenre(prompt))?.label.toLowerCase()} — confirm or switch.`}>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {GENRES.map(({ id, label, icon: Icon }) => (
                            <OptionButton key={id} selected={genre === id} onClick={() => answerCurrent(id)}>
                              <Icon className="size-5 text-accent" />
                              <span>{label}</span>
                            </OptionButton>
                          ))}
                        </div>
                      </QuestionCard>
                    ) : (
                      <QuestionCard title={questions[step - 1].prompt}>
                        {questions[step - 1].id === "theme" ? (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {questions[step - 1].options.map((option) => (
                              <motion.button
                                key={option}
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => answerCurrent(option)}
                                className={`overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                  (answers.theme ?? "") === option ? "border-primary" : "border-border hover:border-primary/50"
                                }`}
                              >
                                <span className="block h-16 w-full" style={{ background: THEME_SWATCHES[option] ?? THEME_SWATCHES.neon }} aria-hidden />
                                <span className="block px-3 py-2 text-sm font-medium capitalize">{option}</span>
                              </motion.button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {questions[step - 1].options.map((option) => (
                              <OptionButton
                                key={option}
                                selected={(answers[questions[step - 1].id] ?? "") === option}
                                onClick={() => answerCurrent(option)}
                              >
                                <span className="capitalize">{option}</span>
                              </OptionButton>
                            ))}
                          </div>
                        )}
                      </QuestionCard>
                    )}

                    <div className="mt-6 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => (step === 0 ? setPhase("compose") : setStep(step - 1))}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ArrowLeft className="size-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={skipAll}
                        data-testid="create-skip-all"
                        className="rounded-lg px-2 py-1 text-sm text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Skip all — use smart defaults
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="building"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card/85 p-8 backdrop-blur-md glow-coral"
            >
              <h2 className="font-display text-2xl font-bold tracking-tight">Building your game…</h2>
              <p className="mt-1 text-sm text-muted-foreground">“{prompt.trim().slice(0, 80)}”</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted" aria-label={`Generation ${job?.progress ?? 0}% complete`}>
                <motion.div className="h-full gradient-warm" animate={{ width: `${job?.progress ?? 3}%` }} />
              </div>
              <ul className="mt-6 grid gap-3">
                {["Writing the game spec", "Building the world", "Playtesting controls"].map((label, index) => (
                  <motion.li
                    key={label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: index <= (job?.checkpoint === "persisted" || job?.checkpoint === "verified" ? 2 : job?.checkpoint === "generated" ? 1 : 0) ? 1 : 0.35, x: 0 }}
                    transition={{ ...spring, delay: index * 0.12 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    {index < (job?.checkpoint === "persisted" || job?.checkpoint === "verified" ? 2 : job?.checkpoint === "generated" ? 1 : 0) ? (
                      <Check className="size-4 text-accent" />
                    ) : index === (job?.checkpoint === "persisted" || job?.checkpoint === "verified" ? 2 : job?.checkpoint === "generated" ? 1 : 0) && job?.status !== "failed" && job?.status !== "canceled" ? (
                      <LoaderCircle className="size-4 animate-spin text-primary" />
                    ) : (
                      <span className="size-4 rounded-full border border-border" />
                    )}
                    {label}
                  </motion.li>
                ))}
              </ul>
              {job?.status === "retrying" ? <p className="mt-5 text-xs text-accent">Retrying safely after a transient {job.stage} failure…</p> : null}
              {job?.error ? <p className="mt-5 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm text-primary" role="alert">{job.error}</p> : null}
              <div className="mt-6 flex gap-3">
                {job && (job.status === "failed" || job.status === "canceled") ? (
                  <button type="button" onClick={() => void resumeGeneration({ jobId: job._id })} className="flex flex-1 items-center justify-center gap-2 rounded-xl gradient-warm px-4 py-2.5 text-sm font-bold text-primary-foreground">
                    <RotateCcw className="size-4" /> Resume
                  </button>
                ) : null}
                {job && (job.status === "queued" || job.status === "running" || job.status === "retrying") ? (
                  <button type="button" onClick={() => void cancelGeneration({ jobId: job._id })} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
                    <X className="size-4" /> Cancel
                  </button>
                ) : null}
                <Link href="/operations" className="flex flex-1 items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">View activity</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function railLabel(questionId: string): string {
  const labels: Record<string, string> = {
    theme: "Art style",
    difficulty: "Challenge",
    "jump-style": "Controls",
    "runner-controls": "Controls",
    "win-condition": "Rules",
    gravity: "Movement",
    "underwater-goal": "Goal",
    "player-count": "Players",
  };
  return labels[questionId] ?? "Details";
}

function ProgressRail({ step, labels }: { step: number; labels: string[] }) {
  return (
    <ol className="hidden w-32 shrink-0 flex-col gap-4 pt-2 sm:flex" aria-label="Question progress">
      {labels.map((label, index) => (
        <li key={`${label}-${index}`} className="flex items-center gap-2.5 text-xs font-medium">
          <span
            className={`grid size-5 place-items-center rounded-full border text-[10px] transition-colors ${
              index < step ? "border-accent bg-accent/20 text-accent" : index === step ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {index < step ? <Check className="size-3" /> : index + 1}
          </span>
          <span className={index === step ? "text-foreground" : "text-muted-foreground"}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function QuestionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary bg-primary/15 text-primary" : "border-border bg-background/40 hover:border-primary/50"
      }`}
    >
      {children}
    </motion.button>
  );
}
