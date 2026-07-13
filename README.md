# Vega Forge

Vega Forge is a local-first prompt-to-game platform. A validated `GameSpec` drives a prebuilt React Three Fiber engine; provider adapters generate specs, Convex stores immutable game versions, and a Playwright service verifies every game through `window.__gameTestApi`.

## Workspace

- `apps/web` — Next.js 15 builder, player, refine, and publish UI.
- `apps/engine-playground` — Vite playground for editing and playing GameSpec JSON without AI.
- `packages/spec` — Zod schemas, JSON Schema, validation, and repair loop.
- `packages/genres` — working platformer, endless-runner, and collector defaults.
- `packages/engine` — spec-driven R3F/Rapier engine and test API.
- `packages/llm` — OpenAI, Anthropic, and Gemini adapter with record/replay fixtures.
- `services/verify-runner` — localhost Playwright verification API.
- `convex` — local database, encrypted BYOK storage, generation/refinement, and dry-run publishing.

## Local testing

### First setup

```bash
pnpm install
cp .env.example .env.local
```

Edit `.env.local`. Replay and publish dry-run are enabled by default, so provider and Vercel keys may remain blank for cost-free testing. If real-provider testing is needed, add one or more LLM keys and set `LLM_REPLAY=false`. The first non-replay golden run can set `LLM_RECORD=true`; subsequent tests should restore `LLM_REPLAY=true`.

`pnpm install` installs the pinned Playwright Chromium build. Convex uses an anonymous local deployment and does not require an account.

### One-command platform startup

```bash
pnpm dev
```

This starts, with prefixed Turborepo logs:

- Next.js at `http://127.0.0.1:3000`
- local Convex at `http://127.0.0.1:3210`
- verify-runner at `http://127.0.0.1:4001`

Convex environment values are synchronized from `.env.local`, then the local test user and encrypted provider keys are seeded automatically. Run `pnpm seed` to seed again while Convex is running.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Browser connection to local Convex. |
| `APP_URL` | URL loaded by the verify-runner. |
| `VERIFY_RUNNER_URL` | Verification service called by Convex actions; defaults to localhost in development. |
| `API_KEY_ENCRYPTION_SECRET` | 32+ character AES-256-GCM secret used only by Convex actions. |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Optional BYOK keys stored encrypted by the seed action. |
| `DEV_MODEL_TIER=cheap` | Forces GPT-4o Mini, Claude Haiku, or Gemini Flash-Lite. |
| `LLM_REPLAY=true` | Replays fixtures and prevents provider calls. |
| `LLM_RECORD=true` | Records raw provider responses for later replay. |
| `PUBLISH_DRY_RUN=true` | Logs the Vercel payload and returns a fake URL. |
| `VERCEL_TOKEN` | Needed only when publish dry-run is disabled. |
| `TEST_USER_EMAIL` / `TEST_USER_NAME` | Seeded local account identity. |

See [`.env.example`](./.env.example) for safe localhost defaults and comments.

### Engine playground

```bash
pnpm dev:playground
```

Open `http://localhost:4000`. Select a genre, edit its JSON, and see Zod validation and the playable engine update immediately. Workspace aliases point directly at engine/spec source, so engine edits hot reload without rebuilding packages.

### Tests

```bash
pnpm test
pnpm test:e2e
```

`pnpm test` runs schema, repair-loop, genre, engine, LLM replay, web, and runner unit suites without API calls. `pnpm test:e2e` starts the localhost stack, drives the complete replayed product flow, and boots nine genre/spec variations in Chromium while checking canvas output, console errors, game state, and FPS.

Run only the verify service when debugging it:

```bash
pnpm --filter verify-runner dev
```

Its API is `POST http://localhost:4001/verify` with `{ "bundleUrl", "expectations" }`.

### Manual smoke checklist

- [ ] Open `http://127.0.0.1:3000/local`.
- [ ] Sign up with the prefilled local name and email.
- [ ] Confirm masked seeded keys appear, or that replay mode says no key spend.
- [ ] Enter a prompt and select a genre/provider.
- [ ] Answer the art-style and difficulty questions.
- [ ] Generate and confirm the status reaches “Playtest passed” or shows verification notes.
- [ ] Play the game inside the iframe and confirm keyboard controls work.
- [ ] Submit a refinement such as “Make it faster and add double jump.”
- [ ] Confirm a new version is loaded and retested.
- [ ] Click dry-run publish and confirm a `.dry-run.local` URL appears.
- [ ] Check the Convex log for the exact Vercel API payload; no network deployment should occur.

The anonymous local deployment state lives under `.convex` and remains outside Git.
