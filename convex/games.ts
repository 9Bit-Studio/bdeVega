import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: (ctx, input) => ctx.db.query("games").withIndex("by_user", (query) => query.eq("userId", input.userId)).order("desc").collect(),
});

export const getCurrent = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, input) => {
    const game = await ctx.db.get(input.gameId);
    if (!game?.currentVersionId) return null;
    const version = await ctx.db.get(game.currentVersionId);
    return version ? { game, version } : null;
  },
});

export const getCurrentInternal = internalQuery({
  args: { gameId: v.id("games") },
  handler: async (ctx, input) => {
    const game = await ctx.db.get(input.gameId);
    if (!game?.currentVersionId) return null;
    const version = await ctx.db.get(game.currentVersionId);
    return version ? { game, version } : null;
  },
});

export const createGenerated = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    genre: v.string(),
    spec: v.any(),
    expectations: v.any(),
  },
  handler: async (ctx, input) => {
    const gameId = await ctx.db.insert("games", {
      userId: input.userId,
      title: input.title,
      genre: input.genre,
      isPublic: false,
      createdAt: Date.now(),
    });
    const versionId = await ctx.db.insert("gameVersions", {
      gameId,
      version: 1,
      spec: input.spec,
      expectations: input.expectations,
      createdBy: "generate",
      verifyResult: { pass: false, pending: true },
      createdAt: Date.now(),
    });
    await ctx.db.patch(gameId, { currentVersionId: versionId });
    return { gameId, versionId };
  },
});

export const createVersion = internalMutation({
  args: {
    gameId: v.id("games"),
    spec: v.any(),
    expectations: v.any(),
    createdBy: v.union(v.literal("refine"), v.literal("revert")),
  },
  handler: async (ctx, input) => {
    const game = await ctx.db.get(input.gameId);
    if (!game?.currentVersionId) throw new Error("Game not found");
    const current = await ctx.db.get(game.currentVersionId);
    if (!current) throw new Error("Current version not found");
    const versionId = await ctx.db.insert("gameVersions", {
      gameId: input.gameId,
      version: current.version + 1,
      spec: input.spec,
      expectations: input.expectations,
      parentVersionId: current._id,
      createdBy: input.createdBy,
      verifyResult: { pass: false, pending: true },
      createdAt: Date.now(),
    });
    await ctx.db.patch(input.gameId, { currentVersionId: versionId });
    return versionId;
  },
});

export const setVerifyResult = internalMutation({
  args: { versionId: v.id("gameVersions"), verifyResult: v.any() },
  handler: (ctx, input) => ctx.db.patch(input.versionId, { verifyResult: input.verifyResult }),
});

export const revert = mutation({
  args: { gameId: v.id("games"), versionId: v.id("gameVersions") },
  handler: async (ctx, input) => {
    const version = await ctx.db.get(input.versionId);
    if (!version || version.gameId !== input.gameId) throw new Error("Version not found");
    await ctx.db.patch(input.gameId, { currentVersionId: input.versionId });
  },
});
