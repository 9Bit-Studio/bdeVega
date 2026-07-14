"use client";

import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { CheckCircle2, Gamepad2, LoaderCircle, Send, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getQuestionsForPrompt, type GenreQuestion } from "@vega/genres";
import type { GameGenre } from "@vega/spec";

type Genre = GameGenre;
type Provider = "openai" | "anthropic" | "gemini";

export function LocalBuilder() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const startGeneration = useMutation(api.generationJobs.start);
  const cancelGeneration = useMutation(api.generationJobs.cancel);
  const resumeGeneration = useMutation(api.generationJobs.resume);
  const refineGame = useAction(api.generation.refine);
  const publishGame = useAction(api.publish.publishToVercel);
  const [email, setEmail] = useState("developer@localhost");
  const [name, setName] = useState("Local Developer");
  const [prompt, setPrompt] = useState("A cheerful platformer with PC controls and collectible stars");
  const [genre, setGenre] = useState<Genre>("platformer");
  const [provider, setProvider] = useState<Provider>("openai");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [jobId, setJobId] = useState<Id<"generationJobs"> | null>(null);
  const [gameId, setGameId] = useState<Id<"games"> | null>(null);
  const [refinement, setRefinement] = useState("Make it faster and add double jump");
  const [status, setStatus] = useState("Ready");
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userId = user?._id ?? null;
  const current = useQuery(api.games.getCurrent, gameId ? { gameId } : "skip");
  const job = useQuery(api.generationJobs.get, jobId ? { jobId } : "skip");
  const keys = useQuery(api.apiKeys.listMasked, userId ? {} : "skip");
  const questions = useMemo(() => getQuestionsForPrompt(genre, prompt), [genre, prompt]);
  const jobActive = job?.status === "queued" || job?.status === "running" || job?.status === "retrying";

  useEffect(() => {
    if (job?.status === "succeeded" && job.gameId) {
      setGameId(job.gameId);
      const verified = (job.verifyLoops.at(-1) as { pass?: boolean } | undefined)?.pass;
      setStatus(verified ? "Playtest passed" : "Game built with verification notes");
    } else if (job?.status === "failed") {
      setStatus(job.error ?? "Generation failed");
    } else if (job?.status === "canceled") {
      setStatus("Generation canceled");
    } else if (jobActive) {
      setStatus(`${job.stage} · ${job.progress}%`);
    }
  }, [job?.error, job?.gameId, job?.progress, job?.stage, job?.status, job?.verifyLoops, jobActive]);

  const signUp = async () => {
    setBusy(true);
    try {
      const credentials = { email, password: "local-development-password", name };
      await signIn("password", { ...credentials, flow: "signUp" }).catch(() =>
        signIn("password", { ...credentials, flow: "signIn" }),
      );
      setStatus("Signed in locally");
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!userId) return;
    setBusy(true);
    setStatus("Building and playtesting…");
    try {
      const selectedAnswers = Object.fromEntries(questions.map((question) => [question.id, answers[question.id] ?? question.defaultOption]));
      const result = await startGeneration({ prompt, genre, provider, answers: selectedAnswers });
      setJobId(result.jobId);
      setStatus("Generation queued");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const refine = async () => {
    if (!gameId) return;
    setBusy(true);
    setStatus("Refining and retesting…");
    try {
      const result = await refineGame({ gameId, request: refinement });
      setStatus(result.verifyResult.pass ? "Refinement passed" : "Refinement saved with verification notes");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Refinement failed — revise the request and try again");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!gameId) return;
    setBusy(true);
    try {
      const result = await publishGame({ gameId });
      setPublishUrl(result.url);
      setStatus(result.dryRun ? "Dry-run publish complete" : "Published");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="local-shell">
      <header className="local-header">
        <Link href="/" className="local-brand"><Gamepad2 size={18} /> Vega Forge Local</Link>
        <span className="local-status">{busy || jobActive ? <LoaderCircle className="spin" size={14} /> : <CheckCircle2 size={14} />} {status}</span>
      </header>

      {!userId ? (
        <section className="local-card auth-card" data-testid="signup-card">
          <p className="eyebrow">LOCAL ACCOUNT</p>
          <h1>Start a localhost session</h1>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <Button onClick={signUp} disabled={busy} data-testid="signup-submit">Continue</Button>
        </section>
      ) : (
        <div className="builder-grid">
          <section className="local-card builder-card">
            <p className="eyebrow">IDEA</p>
            <h1>What should we build?</h1>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} data-testid="prompt-input" />
            <div className="field-grid">
              <label>Genre<select value={genre} onChange={(event) => setGenre(event.target.value as Genre)}><option value="platformer">Platformer</option><option value="precision-platformer">Precision platformer</option><option value="obstacle-course">Obstacle course</option><option value="endless-runner">Endless runner</option><option value="arcade-racer">Arcade racer</option><option value="top-down-collector">Top-down collector</option><option value="score-attack">Score attack</option><option value="maze-escape">Maze escape</option><option value="puzzle-escape">Puzzle escape</option><option value="dungeon-escape">Dungeon escape</option><option value="survival-dodge">Survival dodge</option><option value="exploration">Exploration</option></select></label>
              <label>Provider<select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option></select></label>
            </div>
            {!questionsOpen ? (
              <Button onClick={() => setQuestionsOpen(true)} data-testid="continue-questions">Answer questions</Button>
            ) : (
              <div className="question-stack" data-testid="question-cards">
                <p className="question-context">Questions tailored to “{prompt.trim() || "your idea"}”.</p>
                {questions.map((question) => (
                  <PromptQuestion
                    key={question.id}
                    question={question}
                    value={answers[question.id] ?? question.defaultOption}
                    onChange={(value) => setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: value }))}
                  />
                ))}
                <Button onClick={generate} disabled={busy || jobActive} data-testid="generate-submit"><Send size={15} /> Generate and verify</Button>
                {jobActive && job ? <Button onClick={() => void cancelGeneration({ jobId: job._id })} variant="outline">Cancel</Button> : null}
                {(job?.status === "failed" || job?.status === "canceled") ? <Button onClick={() => void resumeGeneration({ jobId: job._id })} variant="outline">Resume</Button> : null}
              </div>
            )}
            <div className="key-strip">Seeded keys: {keys?.length ? keys.map((key) => `${key.provider} …${key.last4}`).join(" · ") : "Replay mode—no key spend"}</div>
          </section>

          <section className="player-column">
            <div className="player-frame">
              {gameId ? <iframe key={current?.version._id} src={`/play/${gameId}`} title="Generated game" sandbox="allow-scripts allow-pointer-lock allow-same-origin" data-testid="game-iframe" /> : <div className="empty-player"><Gamepad2 size={42} /><p>Your generated game will appear here.</p></div>}
            </div>
            {gameId ? (
              <div className="local-card refine-card">
                <input value={refinement} onChange={(event) => setRefinement(event.target.value)} data-testid="refine-input" />
                <Button onClick={refine} disabled={busy} data-testid="refine-submit">Refine</Button>
                <Button onClick={publish} disabled={busy} variant="outline" data-testid="publish-submit"><UploadCloud size={15} /> Dry-run publish</Button>
                {publishUrl ? <code data-testid="publish-url">{publishUrl}</code> : null}
              </div>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}

function PromptQuestion({ question, value, onChange }: { question: GenreQuestion; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {question.prompt}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {question.options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
