"use node";

import type { GameExpectations, GameGenre, GameSpec } from "@vega/spec";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { expectationsFor, generateSpec, verify } from "./generation";

type JobIntent = { prompt: string; genre: GameGenre };
type WorkerStage = "generating" | "persisting" | "verifying";

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (/429|rate limit|timeout|timed out|network|fetch|socket|econn|503|502|temporar/.test(message)) return true;
  if (/returned 4\d\d/.test(message)) return false;
  if (/no .* api key|authentication|required|not authorized|invalid fields|failed after 3 attempts/.test(message)) return false;
  return false;
}

function failure(error: unknown, stage: WorkerStage) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    failedStage: stage,
    code: `${stage.toUpperCase()}_FAILED`,
    message,
    trace: error instanceof Error ? error.stack : undefined,
    retryable: isRetryable(error),
  };
}

export const run = internalAction({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }): Promise<void> => {
    console.log(`[generationWorker] START jobId=${jobId}`);
    const claimed = await ctx.runMutation(internal.generationJobs.claim, { jobId });
    if (!claimed) {
      console.log(`[generationWorker] SKIP jobId=${jobId} reason=not-claimable`);
      return;
    }

    try {
      let job = await ctx.runQuery(internal.generationJobs.getInternal, { jobId });
      if (!job || job.status === "canceled") return;

      if (job.checkpoint === "none") {
        console.log(`[generationWorker] GENERATE jobId=${jobId} attempt=${job.attempt}`);
        const intent = job.intent as JobIntent;
        const generated = await generateSpec(ctx, {
          userId: job.userId,
          provider: job.provider,
          tier: job.modelTier,
          genre: intent.genre,
          prompt: intent.prompt,
          answers: job.answers as Record<string, string>,
        });
        generated.spec.meta.title = intent.prompt.trim().slice(0, 60) || generated.spec.meta.title;
        const expectations = expectationsFor(generated.spec);
        const stored = await ctx.runMutation(internal.generationJobs.storeGenerated, {
          jobId,
          spec: generated.spec,
          expectations,
          generation: generated.metadata,
        });
        if (!stored) return;
        console.log(`[generationWorker] GENERATED jobId=${jobId} model=${generated.metadata.model}`);
      }

      job = await ctx.runQuery(internal.generationJobs.getInternal, { jobId });
      if (!job || job.status === "canceled") return;
      if (job.checkpoint === "generated") {
        console.log(`[generationWorker] PERSIST jobId=${jobId}`);
        const persisted = await ctx.runMutation(internal.generationJobs.storePersisted, { jobId });
        if (!persisted) return;
        console.log(`[generationWorker] PERSISTED jobId=${jobId} gameId=${persisted.gameId}`);
      }

      job = await ctx.runQuery(internal.generationJobs.getInternal, { jobId });
      if (!job || job.status === "canceled") return;
      if (job.checkpoint === "persisted" && job.gameId && job.versionId && job.expectations && job.generatedSpec) {
        console.log(`[generationWorker] VERIFY jobId=${jobId} gameId=${job.gameId}`);
        const startedAt = Date.now();
        const verifyResult = await verify(job.gameId, job.expectations as GameExpectations, job.generatedSpec as GameSpec);
        const afterVerify = await ctx.runQuery(internal.generationJobs.getInternal, { jobId });
        if (!afterVerify || afterVerify.status === "canceled") return;
        await ctx.runMutation(internal.games.setVerifyResult, { versionId: job.versionId, verifyResult });
        await ctx.runMutation(internal.generationJobs.complete, {
          jobId,
          verifyResult,
          durationMs: Date.now() - startedAt,
        });
        console.log(`[generationWorker] DONE jobId=${jobId} pass=${Boolean(verifyResult.pass)}`);
      }
    } catch (error) {
      const current = await ctx.runQuery(internal.generationJobs.getInternal, { jobId });
      if (!current || current.status === "canceled") return;
      const stage: WorkerStage = current.checkpoint === "none" ? "generating" : current.checkpoint === "generated" ? "persisting" : "verifying";
      const details = failure(error, stage);
      console.error(`[generationWorker] FAIL jobId=${jobId} stage=${stage} error=${details.message}`);
      await ctx.runMutation(internal.generationJobs.fail, { jobId, ...details });
    }
  },
});
