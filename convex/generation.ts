"use node";

import { createLLMClient, MemoryFixtureStore, type LLMResponse, type LLMProvider, type ModelTier } from "@vega/llm";
import { generateOpenAIArtPack, type GeneratedArtImage } from "@vega/llm/node";
import { createArtGenerationPlan, genreSpecs, getGenreCatalogEntry, isMultiplayerPrompt, type ArtGenerationPlan } from "@vega/genres";
import {
  applyGameSpecPatch,
  gameSpecJsonSchema,
  gameSpecPatchJsonSchema,
  gameSpecPatchSchema,
  starterAssetPack,
  validateGameSpecForEngine,
  type EngineCapabilityIssue,
  type GameExpectations,
  type GameGenre,
  type GameSpec,
  type GameSpecPatch,
} from "@vega/spec";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { decryptApiKey } from "./lib/crypto";
import { requireCurrentUser, requireGameOwner } from "./lib/authz";

const providerValidator = v.union(v.literal("openai"), v.literal("anthropic"), v.literal("gemini"));
const genreValidator = v.union(
  v.literal("platformer"), v.literal("precision-platformer"), v.literal("obstacle-course"),
  v.literal("endless-runner"), v.literal("arcade-racer"), v.literal("top-down-collector"),
  v.literal("score-attack"), v.literal("maze-escape"), v.literal("puzzle-escape"),
  v.literal("dungeon-escape"), v.literal("survival-dodge"), v.literal("exploration"),
);
const MAX_GENERATION_ATTEMPTS = 3;

interface ValidationIssue {
  code: string;
  message: string;
  path: string;
}

interface VersionGenerationMetadata {
  prompt: string;
  provider: LLMProvider;
  model: string;
  costUsd: number;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number };
  validation: {
    success: true;
    attempts: number;
    repaired: boolean;
    issues: ValidationIssue[];
  };
  art?: { generated: boolean; model: "gpt-image-2" | "starter-replay"; plan: ArtGenerationPlan };
  patch?: GameSpecPatch;
}

export function expectationsFor(spec: GameSpec): GameExpectations {
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

export async function verify(gameId: string, expectations: GameExpectations, spec: GameSpec) {
  const runnerUrl = process.env.VERIFY_RUNNER_URL ?? "http://127.0.0.1:4001";
  const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
  const encodedSpec = Buffer.from(JSON.stringify(spec), "utf8").toString("base64url");
  const response = await fetch(`${runnerUrl}/verify`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.VERIFY_RUNNER_TOKEN ?? ""}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ bundleUrl: `${appUrl}/play/${gameId}#verifySpec=${encodedSpec}`, expectations }),
  });
  if (!response.ok) throw new Error(`Verify runner returned ${response.status}`);
  return response.json();
}

type SchemaIssue = { code: PropertyKey; message: string; path: PropertyKey[] };

function summarizeIssues(issues: (SchemaIssue | EngineCapabilityIssue)[]): ValidationIssue[] {
  return issues.slice(0, 12).map((issue) => ({
    code: "code" in issue ? String(issue.code) : issue.feature,
    message: issue.message,
    path: issue.path.map(String).join(".") || "root",
  }));
}

function actionableFailure(kind: "Generation" | "Refinement", attempts: number, issues: ValidationIssue[], detail?: string): Error {
  const fields = issues.slice(0, 5).map((issue) => `${issue.path}: ${issue.message}`).join("; ");
  const guidance = fields || detail || "The model did not return schema-valid JSON";
  return new Error(`${kind} failed after ${attempts} attempts. Check the request or switch models, then retry. Invalid fields: ${guidance}`);
}

function aggregateMetadata(
  prompt: string,
  responses: LLMResponse[],
  issues: ValidationIssue[],
  attempts: number,
  patch?: GameSpecPatch,
): VersionGenerationMetadata {
  const last = responses.at(-1)!;
  return {
    prompt,
    provider: last.provider,
    model: last.model,
    costUsd: Number(responses.reduce((total, response) => total + response.costUsd, 0).toFixed(8)),
    latencyMs: responses.reduce((total, response) => total + response.latencyMs, 0),
    usage: {
      inputTokens: responses.reduce((total, response) => total + response.usage.inputTokens, 0),
      outputTokens: responses.reduce((total, response) => total + response.usage.outputTokens, 0),
    },
    validation: {
      success: true,
      attempts,
      repaired: attempts > 1,
      issues,
    },
    ...(patch ? { patch } : {}),
  };
}

async function llmCredentials(ctx: ActionCtx, userId: Id<"users">, provider: LLMProvider) {
  const replay = process.env.LLM_REPLAY !== "false";
  if (replay) return { apiKey: "replay-does-not-use-a-key", replay };
  const stored = await ctx.runQuery(internal.apiKeys.getEncrypted, { userId, provider });
  if (!stored) throw new Error(`No ${provider} API key is configured`);
  return { apiKey: await decryptApiKey(stored.encryptedKey), replay };
}

async function storeGeneratedImage(
  ctx: ActionCtx,
  userId: Id<"users">,
  kind: "player" | "background",
  image: GeneratedArtImage,
) {
  const uploadUrl = await ctx.runMutation(internal.assets.createGeneratedUploadUrl, {});
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "content-type": image.contentType },
    body: Buffer.from(image.bytes),
  });
  if (!response.ok) throw new Error(`Generated ${kind} art upload returned ${response.status}`);
  const { storageId } = await response.json() as { storageId: Id<"_storage"> };
  return ctx.runMutation(internal.assets.registerGeneratedUpload, {
    userId,
    storageId,
    kind,
    generationPrompt: image.prompt,
  });
}

async function createGeneratedArtPack(
  ctx: ActionCtx,
  userId: Id<"users">,
  plan: ArtGenerationPlan,
  replay: boolean,
) {
  if (replay) return { pack: starterAssetPack, model: "starter-replay" as const };
  const stored = await ctx.runQuery(internal.apiKeys.getEncrypted, { userId, provider: "openai" });
  if (!stored) throw new Error("An OpenAI API key is required for generated game art");
  const generated = await generateOpenAIArtPack({
    apiKey: await decryptApiKey(stored.encryptedKey),
    playerPrompt: plan.playerPrompt,
    environmentPrompt: plan.environmentPrompt,
  });
  const [playerUploadId, backgroundUploadId] = await Promise.all([
    storeGeneratedImage(ctx, userId, "player", generated.player),
    storeGeneratedImage(ctx, userId, "background", generated.environment),
  ]);
  const pack = await ctx.runMutation(internal.assets.createGeneratedPack, {
    userId,
    artDirection: plan.style,
    playerUploadId,
    backgroundUploadId,
  });
  return { pack, model: "gpt-image-2" as const };
}

export async function generateSpec(ctx: ActionCtx, input: {
  userId: Id<"users">;
  provider: LLMProvider;
  tier: ModelTier;
  genre: GameGenre;
  prompt: string;
  answers: Record<string, string>;
}): Promise<{ spec: GameSpec; metadata: VersionGenerationMetadata }> {
  if (isMultiplayerPrompt(input.prompt)) throw new Error("Multiplayer generation is not supported yet. Describe a single-player game instead.");
  const replaySpec = structuredClone(genreSpecs[input.genre]);
  const fixtureId = `golden-${input.genre}`;
  const fixtures = new MemoryFixtureStore({
    [fixtureId]: { provider: input.provider, model: "local-replay", raw: JSON.stringify(replaySpec) },
  });
  const { apiKey, replay } = await llmCredentials(ctx, input.userId, input.provider);
  const client = createLLMClient({ fixtureStore: fixtures });
  const responses: LLMResponse[] = [];
  const issueHistory: ValidationIssue[] = [];
  let repairContext = "";

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    let response: LLMResponse<unknown>;
    try {
      response = await client.generate({
        provider: input.provider,
        apiKey,
        tier: input.tier,
        devModelTier: process.env.DEV_MODEL_TIER === "cheap",
        replay,
        record: process.env.LLM_RECORD === "true",
        fixtureId,
        system: attempt === 1
          ? "Create a complete GameSpec JSON that matches the supplied schema. Return JSON only. Checkpoints, moving-platform entities with explicit motion, and trigger entities with declarative actions are supported. Do not use custom scripts, double jump, or invent asset URLs; uploaded asset packs are attached only by the trusted asset pipeline."
          : "Repair only the invalid fields identified below, preserve valid fields, and return the complete corrected GameSpec JSON.",
        messages: [{
          role: "user",
          content: attempt === 1
            ? `${input.prompt}\n\nCreator decisions from the follow-up questions:\n${JSON.stringify(input.answers)}`
            : repairContext,
        }],
        jsonSchema: gameSpecJsonSchema as Record<string, unknown>,
      });
    } catch (error) {
      if (attempt === MAX_GENERATION_ATTEMPTS || replay) {
        throw actionableFailure("Generation", attempt, issueHistory, error instanceof Error ? error.message : "Model call failed");
      }
      repairContext = `The previous response could not be parsed as JSON: ${error instanceof Error ? error.message : "unknown parse error"}. Generate the complete GameSpec again.`;
      continue;
    }

    responses.push(response);
    const parsed = validateGameSpecForEngine(response.data);
    if (parsed.success) {
      const spec = { ...parsed.data, assets: starterAssetPack } as GameSpec;
      const requestedMode = input.answers.dimension;
      const supportedModes = getGenreCatalogEntry(input.genre).dimensions;
      if (requestedMode && supportedModes.includes(requestedMode as GameSpec["world"]["mode"])) {
        spec.world.mode = requestedMode as GameSpec["world"]["mode"];
      }
      const artPlan = createArtGenerationPlan(spec, input.prompt);
      const art = await createGeneratedArtPack(ctx, input.userId, artPlan, replay);
      spec.assets = art.pack;
      if (spec.player.controller !== "platformer") spec.player.model = "sprite";
      const metadata = aggregateMetadata(
        input.prompt,
        responses,
        [...issueHistory, ...summarizeIssues(parsed.warnings)],
        attempt,
      );
      metadata.art = { generated: !replay, model: art.model, plan: artPlan };
      return {
        spec,
        metadata,
      };
    }

    const issues = summarizeIssues(parsed.issues);
    issueHistory.push(...issues);
    repairContext = `Candidate GameSpec:\n${response.raw}\n\nValidation errors:\n${JSON.stringify(issues)}\n\nRepair these invalid fields without changing valid fields.`;
  }

  throw actionableFailure("Generation", MAX_GENERATION_ATTEMPTS, issueHistory);
}

async function generateRefinementPatch(ctx: ActionCtx, input: {
  userId: Id<"users">;
  provider: LLMProvider;
  tier: ModelTier;
  request: string;
  base: GameSpec;
}): Promise<{ spec: GameSpec; metadata: VersionGenerationMetadata }> {
  const fixtureId = `refine-${input.base.meta.genre}`;
  const replayPatch: GameSpecPatch = {
    operations: [
      { op: "replace", path: "/player/speed", value: Math.min(50, input.base.player.speed * 1.25) },
      { op: "replace", path: "/player/doubleJump", value: true },
    ],
  };
  const fixtures = new MemoryFixtureStore({
    [fixtureId]: { provider: input.provider, model: "local-replay", raw: JSON.stringify(replayPatch) },
  });
  const { apiKey, replay } = await llmCredentials(ctx, input.userId, input.provider);
  const client = createLLMClient({ fixtureStore: fixtures });
  const responses: LLMResponse[] = [];
  const issueHistory: ValidationIssue[] = [];
  let repairContext = "";

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    let response: LLMResponse<unknown>;
    try {
      response = await client.generate({
        provider: input.provider,
        apiKey,
        tier: input.tier,
        devModelTier: process.env.DEV_MODEL_TIER === "cheap",
        replay,
        record: process.env.LLM_RECORD === "true",
        fixtureId,
        system: "Translate the refinement request into JSON Pointer operations. Change only requested fields. Never patch /assets or /schemaVersion. Return a structured patch only.",
        messages: [{
          role: "user",
          content: attempt === 1
            ? `Current GameSpec:\n${JSON.stringify(input.base)}\n\nRefinement request:\n${input.request}`
            : repairContext,
        }],
        jsonSchema: gameSpecPatchJsonSchema as Record<string, unknown>,
      });
    } catch (error) {
      if (attempt === MAX_GENERATION_ATTEMPTS || replay) {
        throw actionableFailure("Refinement", attempt, issueHistory, error instanceof Error ? error.message : "Model call failed");
      }
      repairContext = `The previous patch could not be parsed: ${error instanceof Error ? error.message : "unknown parse error"}. Return a valid structured patch for: ${input.request}`;
      continue;
    }

    responses.push(response);
    const patchResult = gameSpecPatchSchema.safeParse(response.data);
    if (!patchResult.success) {
      const issues = summarizeIssues(patchResult.error.issues);
      issueHistory.push(...issues);
      repairContext = `Invalid patch:\n${response.raw}\n\nPatch validation errors:\n${JSON.stringify(issues)}\n\nReturn a corrected patch for: ${input.request}`;
      continue;
    }

    try {
      const spec = applyGameSpecPatch(input.base, patchResult.data);
      const supported = validateGameSpecForEngine(spec);
      if (!supported.success) {
        const issues = summarizeIssues(supported.issues);
        issueHistory.push(...issues);
        repairContext = `The patch ${response.raw} requests unsupported engine features:\n${JSON.stringify(issues)}\nReturn a capability-safe patch for: ${input.request}`;
        continue;
      }
      return {
        spec,
        metadata: aggregateMetadata(
          input.request,
          responses,
          [...issueHistory, ...summarizeIssues(supported.warnings)],
          attempt,
          patchResult.data,
        ),
      };
    } catch (error) {
      const issue = { code: "invalid_patch_result", message: error instanceof Error ? error.message : "Patch produced an invalid GameSpec", path: "patch" };
      issueHistory.push(issue);
      repairContext = `The patch ${response.raw} was valid JSON but could not be applied to the current GameSpec: ${issue.message}. Return a corrected patch for: ${input.request}`;
    }
  }

  throw actionableFailure("Refinement", MAX_GENERATION_ATTEMPTS, issueHistory);
}

// Existing creation screens use this direct action. The queued generationJobs
// API calls the same generateSpec pipeline through generationWorker.
export const start = action({
  args: {
    prompt: v.string(),
    genre: genreValidator,
    provider: v.optional(providerValidator),
    answers: v.any(),
  },
  handler: async (ctx, input): Promise<{
    gameId: Id<"games">;
    versionId: Id<"gameVersions">;
    verifyResult: { pass: boolean; failures?: unknown[] };
  }> => {
    const userId = await requireCurrentUser(ctx);
    const settings: { defaultProvider: LLMProvider; modelTiers: Record<LLMProvider, ModelTier> } =
      await ctx.runQuery(internal.settings.getInternal, { userId });
    const provider = input.provider ?? settings.defaultProvider;
    const generated = await generateSpec(ctx, { ...input, userId, provider, tier: settings.modelTiers[provider] });
    generated.spec.meta.title = input.prompt.trim().slice(0, 60) || generated.spec.meta.title;
    const expectations = expectationsFor(generated.spec);
    const created: { gameId: Id<"games">; versionId: Id<"gameVersions"> } = await ctx.runMutation(internal.games.createGenerated, {
      userId,
      title: generated.spec.meta.title,
      genre: generated.spec.meta.genre,
      spec: generated.spec,
      expectations,
      generation: generated.metadata,
    });
    const verifyResult = await verify(created.gameId, expectations, generated.spec).catch((error) => ({
      pass: false,
      failures: [{ type: "browser", message: error instanceof Error ? error.message : "Verification failed" }],
    }));
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
      game: { userId: Id<"users">; currentVersionId?: Id<"gameVersions"> };
      version: { spec: unknown; expectations: unknown };
    } | null = await ctx.runQuery(internal.games.getCurrentInternal, { gameId: input.gameId });
    await requireGameOwner(ctx, input.gameId, current?.game ?? null);
    if (!current) throw new Error("Game not found");
    const baseResult = validateGameSpecForEngine(current.version.spec);
    if (!baseResult.success) throw actionableFailure("Refinement", 0, summarizeIssues(baseResult.issues), "The current saved version is invalid");

    const settings: { defaultProvider: LLMProvider; modelTiers: Record<LLMProvider, ModelTier> } =
      await ctx.runQuery(internal.settings.getInternal, { userId: current.game.userId });
    const provider = settings.defaultProvider;
    const refined = await generateRefinementPatch(ctx, {
      userId: current.game.userId,
      provider,
      tier: settings.modelTiers[provider],
      request: input.request,
      base: baseResult.data,
    });
    const expectations = expectationsFor(refined.spec);
    const versionId: Id<"gameVersions"> = await ctx.runMutation(internal.games.createVersion, {
      gameId: input.gameId,
      spec: refined.spec,
      expectations,
      createdBy: "refine",
      generation: refined.metadata,
    });
    const verifyResult = await verify(input.gameId, expectations, refined.spec).catch((error) => ({
      pass: false,
      failures: [{ type: "browser", message: error instanceof Error ? error.message : "Verification failed" }],
    }));
    await ctx.runMutation(internal.games.setVerifyResult, { versionId, verifyResult });
    return { versionId, verifyResult };
  },
});
