"use client";

import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { CheckCircle2, Gamepad2, LoaderCircle, Send, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Genre = "platformer" | "endless-runner" | "top-down-collector";
type Provider = "openai" | "anthropic" | "gemini";

export function LocalBuilder() {
  const ensureUser = useMutation(api.localUsers.ensure);
  const startGeneration = useAction(api.generation.start);
  const refineGame = useAction(api.generation.refine);
  const publishGame = useAction(api.publish.publishToVercel);
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [email, setEmail] = useState("developer@localhost");
  const [name, setName] = useState("Local Developer");
  const [prompt, setPrompt] = useState("A cheerful platformer with PC controls and collectible stars");
  const [genre, setGenre] = useState<Genre>("platformer");
  const [provider, setProvider] = useState<Provider>("openai");
  const [theme, setTheme] = useState("neon");
  const [difficulty, setDifficulty] = useState("balanced");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [gameId, setGameId] = useState<Id<"games"> | null>(null);
  const [refinement, setRefinement] = useState("Make it faster and add double jump");
  const [status, setStatus] = useState("Ready");
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = useQuery(api.games.getCurrent, gameId ? { gameId } : "skip");
  const keys = useQuery(api.apiKeys.listMasked, userId ? { userId } : "skip");

  const signUp = async () => {
    setBusy(true);
    try {
      setUserId(await ensureUser({ email, name }));
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
      const result = await startGeneration({ userId, prompt, genre, provider, answers: { theme, difficulty } });
      setGameId(result.gameId);
      setStatus(result.verifyResult.pass ? "Playtest passed" : "Game built with verification notes");
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
        <span className="local-status">{busy ? <LoaderCircle className="spin" size={14} /> : <CheckCircle2 size={14} />} {status}</span>
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
              <label>Genre<select value={genre} onChange={(event) => setGenre(event.target.value as Genre)}><option value="platformer">Platformer</option><option value="endless-runner">Endless runner</option><option value="top-down-collector">Top-down collector</option></select></label>
              <label>Provider<select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option></select></label>
            </div>
            {!questionsOpen ? (
              <Button onClick={() => setQuestionsOpen(true)} data-testid="continue-questions">Answer questions</Button>
            ) : (
              <div className="question-stack" data-testid="question-cards">
                <label>Art style<select value={theme} onChange={(event) => setTheme(event.target.value)}><option>neon</option><option>pastel</option><option>voxel</option><option>retro</option></select></label>
                <label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>relaxed</option><option>balanced</option><option>demanding</option></select></label>
                <Button onClick={generate} disabled={busy} data-testid="generate-submit"><Send size={15} /> Generate and verify</Button>
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
