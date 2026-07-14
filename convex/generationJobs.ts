import type { LLMProvider, ModelTier } from "@vega/llm";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./lib/authz";
import {
  DAY_MS,
  MINUTE_MS,
  PROVIDER_GENERATION_LIMITS,
  USER_GENERATION_LIMITS,
  isActiveGenerationStatus,
  jobCost,
  reservedGenerationCost,
} from "./lib/generationPolicy";

const providerValidator = v.union(v.literal("openai"), v.literal("anthropic"), v.literal("gemini"));
const genreValidator = v.union(v.literal("platformer"), v.literal("endless-runner"), v.literal("top-down-collector"));
const generationStageValidator = v.union(v.literal("generating"), v.literal("persisting"), v.literal("verifying"));

function quotaError(code: string, message: string, retryAt: number) {
  return new ConvexError({ code, message, retryAt });
}

function publicJob(job: Doc<"generationJobs">) {
  const { generatedSpec: _generatedSpec, expectations: _expectations, ...safe } = job;
  return safe;
}

async function assertQuota(
  ctx: MutationCtx,
  userId: Id<"users">,
  provider: LLMProvider,
  reservation: number,
  now: number,
) {
  const userJobs = await ctx.db
    .query("generationJobs")
    .withIndex("by_user_created", (q) => q.eq("userId", userId).gte("createdAt", now - DAY_MS))
    .take(1_000);
  const userActive = userJobs.filter((job) => isActiveGenerationStatus(job.status));
  if (userActive.length >= USER_GENERATION_LIMITS.activeJobs) {
    throw quotaError("USER_ACTIVE_LIMIT", `You can run ${USER_GENERATION_LIMITS.activeJobs} generations at once.`, now + MINUTE_MS);
  }
  if (userJobs.length >= USER_GENERATION_LIMITS.jobsPerDay) {
    throw quotaError("USER_DAILY_LIMIT", `Daily generation limit reached (${USER_GENERATION_LIMITS.jobsPerDay}).`, userJobs.at(-1)!.createdAt + DAY_MS);
  }
  const userCost = userJobs.reduce((sum, job) => sum + jobCost(job), 0);
  if (userCost + reservation > USER_GENERATION_LIMITS.costUsdPerDay) {
    throw quotaError("USER_COST_LIMIT", `Daily generation budget reached ($${USER_GENERATION_LIMITS.costUsdPerDay.toFixed(2)}).`, now + DAY_MS);
  }

  const providerJobs = await ctx.db
    .query("generationJobs")
    .withIndex("by_provider_created", (q) => q.eq("provider", provider).gte("createdAt", now - DAY_MS))
    .take(2_000);
  const limits = PROVIDER_GENERATION_LIMITS[provider];
  const active = providerJobs.filter((job) => isActiveGenerationStatus(job.status));
  const lastMinute = providerJobs.filter((job) => job.createdAt >= now - MINUTE_MS);
  const providerCost = providerJobs.reduce((sum, job) => sum + jobCost(job), 0);
  if (active.length >= limits.activeJobs) throw quotaError("PROVIDER_ACTIVE_LIMIT", `${provider} is at its concurrency limit.`, now + MINUTE_MS);
  if (lastMinute.length >= limits.jobsPerMinute) throw quotaError("PROVIDER_RATE_LIMIT", `${provider} is at its per-minute quota.`, lastMinute.at(-1)!.createdAt + MINUTE_MS);
  if (providerJobs.length >= limits.jobsPerDay) throw quotaError("PROVIDER_DAILY_LIMIT", `${provider} is at its daily job quota.`, providerJobs.at(-1)!.createdAt + DAY_MS);
  if (providerCost + reservation > limits.costUsdPerDay) throw quotaError("PROVIDER_COST_LIMIT", `${provider} is at its daily cost quota.`, now + DAY_MS);
}

export const start = mutation({
  args: {
    prompt: v.string(),
    genre: genreValidator,
    provider: v.optional(providerValidator),
    answers: v.any(),
  },
  handler: async (ctx, input): Promise<{ jobId: Id<"generationJobs"> }> => {
    const userId = await requireCurrentUser(ctx);
    const settings = await ctx.db.query("userSettings").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    const provider = input.provider ?? settings?.defaultProvider ?? "openai";
    const tier: ModelTier = settings?.modelTiers[provider] ?? "strong";
    const now = Date.now();
    const reservation = reservedGenerationCost(provider, tier);
    await assertQuota(ctx, userId, provider, reservation, now);

    const jobId = await ctx.db.insert("generationJobs", {
      userId,
      provider,
      modelTier: tier,
      status: "queued",
      stage: "queued",
      checkpoint: "none",
      progress: 0,
      progressLog: ["Job created"],
      intent: { prompt: input.prompt.trim(), genre: input.genre },
      answers: input.answers,
      verifyLoops: [],
      estimatedCostUsd: reservation,
      attempt: 0,
      maxAttempts: 3,
      updatedAt: now,
      createdAt: now,
    });
    await ctx.db.insert("generationJobEvents", {
      jobId,
      userId,
      stage: "queued",
      level: "info",
      message: "Generation job created",
      attempt: 0,
      details: { provider, tier },
      createdAt: now,
    });
    const scheduledFunctionId = await ctx.scheduler.runAfter(0, internal.generationWorker.run, { jobId });
    await ctx.db.patch(jobId, { scheduledFunctionId });
    return { jobId };
  },
});

export const get = query({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    const userId = await requireCurrentUser(ctx);
    const job = await ctx.db.get(jobId);
    if (!job || job.userId !== userId) return null;
    return publicJob(job);
  },
});

export const events = query({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    const userId = await requireCurrentUser(ctx);
    const job = await ctx.db.get(jobId);
    if (!job || job.userId !== userId) return [];
    return ctx.db.query("generationJobEvents").withIndex("by_job", (q) => q.eq("jobId", jobId)).order("desc").take(100);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUser(ctx);
    const jobs = await ctx.db.query("generationJobs").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(50);
    return jobs.map(publicJob);
  },
});

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUser(ctx);
    const now = Date.now();
    const jobs = await ctx.db
      .query("generationJobs")
      .withIndex("by_user_created", (q) => q.eq("userId", userId).gte("createdAt", now - DAY_MS))
      .take(1_000);
    const recent = [...jobs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50).map(publicJob);
    const verificationFailures = jobs.filter((job) => {
      const last = job.verifyLoops.at(-1) as { pass?: boolean } | undefined;
      return last?.pass === false;
    }).length;
    const providerTotals = (["openai", "anthropic", "gemini"] as const).map((provider) => {
      const providerJobs = jobs.filter((job) => job.provider === provider);
      return {
        provider,
        jobs: providerJobs.length,
        failures: providerJobs.filter((job) => job.status === "failed").length,
        costUsd: providerJobs.reduce((sum, job) => sum + jobCost(job), 0),
      };
    });
    return {
      summary: {
        total: jobs.length,
        active: jobs.filter((job) => isActiveGenerationStatus(job.status)).length,
        generationFailures: jobs.filter((job) => job.status === "failed").length,
        verificationFailures,
        costUsd: jobs.reduce((sum, job) => sum + jobCost(job), 0),
      },
      limits: USER_GENERATION_LIMITS,
      providerTotals,
      recent,
    };
  },
});

export const cancel = mutation({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    const userId = await requireCurrentUser(ctx);
    const job = await ctx.db.get(jobId);
    if (!job || job.userId !== userId) throw new Error("Generation job not found");
    if (job.status === "succeeded" || job.status === "failed" || job.status === "canceled") return;
    const now = Date.now();
    await ctx.db.patch(jobId, {
      status: "canceled",
      stage: "canceled",
      progressLog: [...job.progressLog, "Canceled by user"],
      canceledAt: now,
      finishedAt: now,
      updatedAt: now,
      nextAttemptAt: undefined,
    });
    await ctx.db.insert("generationJobEvents", {
      jobId,
      userId,
      stage: job.stage,
      level: "warning",
      message: "Job canceled by user",
      attempt: job.attempt,
      createdAt: now,
    });
  },
});

export const resume = mutation({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    const userId = await requireCurrentUser(ctx);
    const job = await ctx.db.get(jobId);
    if (!job || job.userId !== userId) throw new Error("Generation job not found");
    if (job.status !== "failed" && job.status !== "canceled") throw new Error("Only failed or canceled jobs can be resumed");
    const now = Date.now();
    const scheduledFunctionId = await ctx.scheduler.runAfter(0, internal.generationWorker.run, { jobId });
    await ctx.db.patch(jobId, {
      status: "queued",
      stage: "queued",
      progressLog: [...job.progressLog, "Resumed by user"],
      maxAttempts: Math.max(job.maxAttempts, job.attempt + 3),
      scheduledFunctionId,
      error: undefined,
      errorCode: undefined,
      finishedAt: undefined,
      canceledAt: undefined,
      nextAttemptAt: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("generationJobEvents", {
      jobId,
      userId,
      stage: "queued",
      level: "info",
      message: "Job resumed by user",
      attempt: job.attempt,
      createdAt: now,
    });
  },
});

export const getInternal = internalQuery({
  args: { jobId: v.id("generationJobs") },
  handler: (ctx, { jobId }) => ctx.db.get(jobId),
});

export const claim = internalMutation({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job || (job.status !== "queued" && job.status !== "retrying")) return null;
    const now = Date.now();
    const stage = job.checkpoint === "none" ? "generating" : job.checkpoint === "generated" ? "persisting" : "verifying";
    const progress = stage === "generating" ? 10 : stage === "persisting" ? 50 : 75;
    const attempt = job.attempt + 1;
    await ctx.db.patch(jobId, {
      status: "running",
      stage,
      progress,
      attempt,
      startedAt: job.startedAt ?? now,
      updatedAt: now,
      nextAttemptAt: undefined,
    });
    await ctx.db.insert("generationJobEvents", {
      jobId,
      userId: job.userId,
      stage,
      level: "info",
      message: `Starting ${stage} step`,
      attempt,
      createdAt: now,
    });
    return { ...job, status: "running" as const, stage, progress, attempt };
  },
});

export const storeGenerated = internalMutation({
  args: { jobId: v.id("generationJobs"), spec: v.any(), expectations: v.any(), generation: v.any() },
  handler: async (ctx, { jobId, spec, expectations, generation }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.status === "canceled") return false;
    const now = Date.now();
    await ctx.db.patch(jobId, {
      generatedSpec: spec,
      expectations,
      generation,
      estimatedCostUsd: typeof generation?.costUsd === "number" ? generation.costUsd : job.estimatedCostUsd,
      checkpoint: "generated",
      stage: "persisting",
      progress: 45,
      progressLog: [...job.progressLog, "Game specification generated"],
      updatedAt: now,
    });
    await ctx.db.insert("generationJobEvents", {
      jobId,
      userId: job.userId,
      stage: "generating",
      level: "info",
      message: "Game specification generated and checkpointed",
      attempt: job.attempt,
      details: { model: generation?.model, usage: generation?.usage, costUsd: generation?.costUsd },
      createdAt: now,
    });
    return true;
  },
});

export const storePersisted = internalMutation({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.status === "canceled") return false;
    if (job.gameId && job.versionId) return { gameId: job.gameId, versionId: job.versionId };
    if (!job.generatedSpec || !job.expectations || !job.generation) throw new Error("Generated job checkpoint is incomplete");
    const spec = job.generatedSpec as { meta: { title: string; genre: string } };
    const now = Date.now();
    const gameId = await ctx.db.insert("games", {
      userId: job.userId,
      title: spec.meta.title,
      genre: spec.meta.genre,
      isPublic: false,
      createdAt: now,
    });
    const versionId = await ctx.db.insert("gameVersions", {
      gameId,
      version: 1,
      spec: job.generatedSpec,
      expectations: job.expectations,
      createdBy: "generate",
      generation: job.generation,
      verifyResult: { pass: false, pending: true },
      createdAt: now,
    });
    await ctx.db.patch(gameId, { currentVersionId: versionId });
    await ctx.db.patch(jobId, {
      gameId,
      versionId,
      checkpoint: "persisted",
      stage: "verifying",
      progress: 70,
      progressLog: [...job.progressLog, "Playable version persisted"],
      updatedAt: now,
    });
    await ctx.db.insert("generationJobEvents", {
      jobId,
      userId: job.userId,
      stage: "persisting",
      level: "info",
      message: "Playable game version persisted",
      attempt: job.attempt,
      details: { gameId, versionId },
      createdAt: now,
    });
    return { gameId, versionId };
  },
});

export const complete = internalMutation({
  args: { jobId: v.id("generationJobs"), verifyResult: v.any(), durationMs: v.number() },
  handler: async (ctx, { jobId, verifyResult, durationMs }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.status === "canceled") return;
    const now = Date.now();
    const loop = { ...verifyResult, attempt: job.attempt, durationMs, createdAt: now };
    await ctx.db.patch(jobId, {
      status: "succeeded",
      stage: "completed",
      checkpoint: "verified",
      progress: 100,
      verifyLoops: [...job.verifyLoops, loop],
      progressLog: [...job.progressLog, verifyResult.pass ? "Verification passed" : "Verification completed with failures"],
      finishedAt: now,
      updatedAt: now,
      error: undefined,
      errorCode: undefined,
    });
    await ctx.db.insert("generationJobEvents", {
      jobId,
      userId: job.userId,
      stage: "verifying",
      level: verifyResult.pass ? "info" : "warning",
      message: verifyResult.pass ? "Verification passed" : "Verification returned failures",
      attempt: job.attempt,
      details: { verifyResult, durationMs },
      createdAt: now,
    });
  },
});

export const fail = internalMutation({
  args: {
    jobId: v.id("generationJobs"),
    failedStage: generationStageValidator,
    code: v.string(),
    message: v.string(),
    trace: v.optional(v.string()),
    retryable: v.boolean(),
  },
  handler: async (ctx, input): Promise<null> => {
    const job = await ctx.db.get(input.jobId);
    if (!job || job.status === "canceled") return null;
    const now = Date.now();
    await ctx.db.insert("generationJobEvents", {
      jobId: input.jobId,
      userId: job.userId,
      stage: input.failedStage,
      level: "error",
      message: input.message,
      attempt: job.attempt,
      details: { code: input.code, trace: input.trace },
      createdAt: now,
    });
    if (input.retryable && job.attempt < job.maxAttempts) {
      const delayMs = Math.min(60_000, 1_000 * (2 ** Math.max(0, job.attempt - 1)));
      const scheduledFunctionId = await ctx.scheduler.runAfter(delayMs, internal.generationWorker.run, { jobId: input.jobId });
      await ctx.db.patch(input.jobId, {
        status: "retrying",
        stage: input.failedStage,
        error: input.message,
        errorCode: input.code,
        scheduledFunctionId,
        nextAttemptAt: now + delayMs,
        progressLog: [...job.progressLog, `${input.failedStage} failed; retrying in ${Math.ceil(delayMs / 1_000)}s`],
        updatedAt: now,
      });
      await ctx.db.insert("generationJobEvents", {
        jobId: input.jobId,
        userId: job.userId,
        stage: input.failedStage,
        level: "warning",
        message: `Retry scheduled in ${Math.ceil(delayMs / 1_000)} seconds`,
        attempt: job.attempt,
        createdAt: now,
      });
      return null;
    }
    await ctx.db.patch(input.jobId, {
      status: "failed",
      stage: "failed",
      error: input.message,
      errorCode: input.code,
      finishedAt: now,
      updatedAt: now,
      nextAttemptAt: undefined,
      progressLog: [...job.progressLog, `${input.failedStage} failed permanently`],
    });
    return null;
  },
});
