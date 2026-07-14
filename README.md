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

Convex environment values are synchronized from `.env.local`. The local builder creates a real password-authenticated Convex session; replay mode does not require seeded provider keys.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Browser connection to local Convex. |
| `APP_URL` | URL loaded by the verify-runner. |
| `VERIFY_RUNNER_URL` | Verification service called by Convex actions; defaults to localhost in development. |
| `VERIFY_RUNNER_TOKEN` | 32+ character service credential shared only by Convex and the verifier. |
| `VERIFY_ALLOWED_APP_ORIGINS` | Exact comma-separated app origins the verifier may navigate to. |
| `VERIFY_ALLOW_PRIVATE_ADDRESSES` | Local-only escape hatch for localhost verification; keep `false` in production. |
| `VERIFY_MAX_CONCURRENT` / `VERIFY_RATE_LIMIT_PER_MINUTE` | Verifier concurrency and per-instance request limits. |
| `API_KEY_ENCRYPTION_SECRET` | 32+ character AES-256-GCM secret used only by Convex actions. |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Optional local provider values; user BYOK keys are saved through the authenticated settings flow. |
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

Its API is `POST http://localhost:4001/verify` with `{ "bundleUrl", "expectations" }` and an `Authorization: Bearer <VERIFY_RUNNER_TOKEN>` service header.

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

## Production deployment

The production topology separates the browser app, Convex backend, and Chromium runner:

1. Create a Vercel project for `apps/web`. The checked-in [`apps/web/vercel.json`](./apps/web/vercel.json) uses the workspace lockfile and builds `@vega/web` through Turbo.
2. Create a production Convex project and deploy the functions:

   ```bash
   npx convex login
   npx convex deploy
   ```

   Set `API_KEY_ENCRYPTION_SECRET`, `APP_URL`, `VERIFY_RUNNER_URL`, `LLM_REPLAY=false`, `DEV_MODEL_TIER=cheap`, `PUBLISH_DRY_RUN=true`, and any provider configuration with `npx convex env set --prod NAME VALUE`. Put the resulting production Convex URL in Vercel as `NEXT_PUBLIC_CONVEX_URL`.
3. Build and deploy [`services/verify-runner/Dockerfile`](./services/verify-runner/Dockerfile) to a container host such as Cloud Run, Fly.io, Railway, or Render. Set its public HTTPS URL as Convex's `VERIFY_RUNNER_URL`. Give Convex and the runner the same fresh `VERIFY_RUNNER_TOKEN`, set `VERIFY_ALLOWED_APP_ORIGINS` to the exact production app origin, and keep `VERIFY_ALLOW_PRIVATE_ADDRESSES=false`. The runner binds to `0.0.0.0` in hosted environments and installs Chromium during the image build.
4. Verify production generation while `PUBLISH_DRY_RUN=true`. When ready, set the shared platform `VERCEL_TOKEN` and (recommended) its `VERCEL_TEAM_ID` in Convex, then switch `PUBLISH_DRY_RUN=false`. No user Vercel credential is used: every generated game project is created in that shared Vercel scope. The latest deployment for the current game version is loaded inside Vega's game screen; unpublished or newly refined games use the built-in player until they are published again.

Keep separate Convex preview/staging and production deployments. Do not copy `.env.local`, local encryption secrets, or local seeded data into production.
