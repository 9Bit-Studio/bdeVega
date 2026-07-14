import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCurrentUser, requireGameOwner } from "./lib/authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUser(ctx);
    return ctx.db.query("games").withIndex("by_user", (query) => query.eq("userId", userId)).order("desc").collect();
  },
});

export const listWithMeta = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUser(ctx);
    const games = await ctx.db.query("games").withIndex("by_user", (query) => query.eq("userId", userId)).order("desc").collect();
    return Promise.all(games.map(async (game) => {
      const versions = await ctx.db.query("gameVersions").withIndex("by_game", (query) => query.eq("gameId", game._id)).collect();
      return { ...game, versionCount: versions.length, plays: game.plays ?? 0 };
    }));
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    const games = await ctx.db.query("games").withIndex("by_public", (query) => query.eq("isPublic", true)).order("desc").take(60);
    return Promise.all(games.map(async (game) => {
      const versions = await ctx.db.query("gameVersions").withIndex("by_game", (query) => query.eq("gameId", game._id)).collect();
      return { ...game, versionCount: versions.length, plays: game.plays ?? 0 };
    }));
  },
});

export const setPublic = mutation({
  args: { gameId: v.id("games"), isPublic: v.boolean() },
  handler: async (ctx, input) => {
    const game = await ctx.db.get(input.gameId);
    await requireGameOwner(ctx, input.gameId, game);
    await ctx.db.patch(input.gameId, { isPublic: input.isPublic });
  },
});

export const recordPlay = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, input) => {
    const game = await ctx.db.get(input.gameId);
    await requireGameOwner(ctx, input.gameId, game);
    if (!game) throw new Error("Game not found");
    await ctx.db.patch(input.gameId, { plays: (game.plays ?? 0) + 1 });
  },
});

export const getCurrent = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, input) => {
    const game = await ctx.db.get(input.gameId);
    await requireGameOwner(ctx, input.gameId, game);
    if (!game?.currentVersionId) return null;
    const version = await ctx.db.get(game.currentVersionId);
    if (!version) return null;

    // A published URL is only valid for the version it was built from. This
    // prevents the player from showing an older Vercel build after a refine.
    const publishes = await ctx.db
      .query("publishes")
      .withIndex("by_game", (query) => query.eq("gameId", input.gameId))
      .collect();
    const published = publishes
      .filter((publish) => publish.versionId === version._id && publish.status === "ready")
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    return { game, version, publishedUrl: published?.url ?? null };
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

export const getOwnerInternal = internalQuery({
  args: { gameId: v.id("games") },
  handler: (ctx, input) => ctx.db.get(input.gameId),
});

export const createGenerated = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    genre: v.string(),
    spec: v.any(),
    expectations: v.any(),
    generation: v.any(),
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
      generation: input.generation,
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
    generation: v.any(),
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
      generation: input.generation,
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
    const game = await ctx.db.get(input.gameId);
    await requireGameOwner(ctx, input.gameId, game);
    const version = await ctx.db.get(input.versionId);
    if (!version || version.gameId !== input.gameId) throw new Error("Version not found");
    await ctx.db.patch(input.gameId, { currentVersionId: input.versionId });
  },
});
