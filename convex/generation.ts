"use node";

import { createLLMClient, MemoryFixtureStore } from "@vega/llm";
import { genreSpecs } from "@vega/genres";
import { gameSpecJsonSchema, validateGameSpec, type GameExpectations, type GameGenre, type GameSpec } from "@vega/spec";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { decryptApiKey } from "./lib/crypto";

const providerValidator = v.union(v.literal("openai"), v.literal("anthropic"), v.literal("gemini"));
const genreValidator = v.union(v.literal("platformer"), v.literal("endless-runner"), v.literal("top-down-collector"));

function expectationsFor(spec: GameSpec): GameExpectations {
  const jump = spec.controls.find((control) => control.action === "jump");
  return {
    fpsFloor: 30,
    assertions: jump ? [{
      id: "jump",
      description: `${jump.key} makes the player jump`,
      input: { key: jump.key, durationMs: 120 },
      path: "playerPosition.y",
      operator: "increased",
    }] : [],
  };
}

async function verify(gameId: string, expectations: GameExpectations) {
  const runnerUrl = process.env.VERIFY_RUNNER_URL ?? "http://127.0.0.1:4001";
  const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
  const response = await fetch(`${runnerUrl}/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bundleUrl: `${appUrl}/play/${gameId}`, expectations }),
  });
  if (!response.ok) throw new Error(`Verify runner returned ${response.status}`);
  return response.json();
}

async function generateSpec(ctx: ActionCtx, input: {
  userId: Id<"users">;
  provider: "openai" | "anthropic" | "gemini";
  genre: GameGenre;
  prompt: string;
  answers: Record<string, string>;
}): Promise<GameSpec> {
  const fallback = structuredClone(genreSpecs[input.genre]);
  const replay = process.env.LLM_REPLAY !== "false";
  const fixtureId = `golden-${input.genre}`;
  const fixtures = new MemoryFixtureStore({
    [fixtureId]: { provider: input.provider, model: "local-replay", raw: JSON.stringify(fallback) },
  });
  let apiKey = "replay-does-not-use-a-key";
  if (!replay) {
    const stored = await ctx.runQuery(internal.apiKeys.getEncrypted, {
      userId: input.userId,
      provider: input.provider,
    });
    if (!stored) throw new Error(`No ${input.provider} API key is configured`);
    apiKey = await decryptApiKey(stored.encryptedKey);
  }
  const response = await createLLMClient({ fixtureStore: fixtures }).generate<GameSpec>({
    provider: input.provider,
    apiKey,
    tier: "strong",
    devModelTier: process.env.DEV_MODEL_TIER === "cheap",
    replay,
    record: process.env.LLM_RECORD === "true",
    fixtureId,
    system: "Create a complete GameSpec JSON. Return JSON only.",
    messages: [{
      role: "user",
      content: `${input.prompt}\n\nCreator decisions from the follow-up questions:\n${JSON.stringify(input.answers)}`,
    }],
    jsonSchema: gameSpecJsonSchema as Record<string, unknown>,
  });
  const parsed = validateGameSpec(response.data);
  return parsed.success ? parsed.data : fallback;
}

export const start = action({
  args: {
    userId: v.id("users"),
    prompt: v.string(),
    genre: genreValidator,
    provider: providerValidator,
    answers: v.any(),
  },
  handler: async (ctx, input): Promise<{
    gameId: Id<"games">;
    versionId: Id<"gameVersions">;
    verifyResult: { pass: boolean; failures?: unknown[] };
  }> => {
    const spec = await generateSpec(ctx, input);
    spec.meta.title = input.prompt.trim().slice(0, 60) || spec.meta.title;
    const expectations = expectationsFor(spec);
    const created: { gameId: Id<"games">; versionId: Id<"gameVersions"> } = await ctx.runMutation(internal.games.createGenerated, {
      userId: input.userId,
      title: spec.meta.title,
      genre: spec.meta.genre,
      spec,
      expectations,
    });
    let verifyResult: { pass: boolean; failures?: unknown[] };
    try {
      verifyResult = await verify(created.gameId, expectations);
    } catch (error) {
      verifyResult = { pass: false, failures: [{ type: "browser", message: error instanceof Error ? error.message : "Verification failed" }] };
    }
    await ctx.runMutation(internal.games.setVerifyResult, { versionId: created.versionId, verifyResult });
    return { ...created, verifyResult };
  },
});

export const refine = action({
  args: { gameId: v.id("games"), request: v.string() },
  handler: async (ctx, input): Promise<{
    versionId: Id<"gameVersions">;
    verifyResult: { pass: boolean; failures?: unknown[] };
  }> => {
    const current: {
      game: { currentVersionId?: Id<"gameVersions"> };
      version: { spec: unknown; expectations: unknown };
    } | null = await ctx.runQuery(internal.games.getCurrentInternal, { gameId: input.gameId });
    if (!current) throw new Error("Game not found");
    const spec = structuredClone(current.version.spec) as GameSpec;
    const request = input.request.toLowerCase();
    if (request.includes("faster")) spec.player.speed = Math.min(50, spec.player.speed * 1.25);
    if (request.includes("double jump")) spec.player.doubleJump = true;
    if (request.includes("night")) {
      spec.world.theme = "neon";
      spec.visuals.lighting = "neon-night";
    }
    const expectations = expectationsFor(spec);
    const versionId: Id<"gameVersions"> = await ctx.runMutation(internal.games.createVersion, {
      gameId: input.gameId,
      spec,
      expectations,
      createdBy: "refine",
    });
    const verifyResult = await verify(input.gameId, expectations).catch((error) => ({
      pass: false,
      failures: [{ type: "browser", message: error instanceof Error ? error.message : "Verification failed" }],
    }));
    await ctx.runMutation(internal.games.setVerifyResult, { versionId, verifyResult });
    return { versionId, verifyResult };
  },
});
