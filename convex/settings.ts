import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const providerValidator = v.union(v.literal("openai"), v.literal("anthropic"), v.literal("gemini"));
const tierValidator = v.union(v.literal("fast"), v.literal("strong"));
const modelTiersValidator = v.object({ openai: tierValidator, anthropic: tierValidator, gemini: tierValidator });

export const DEFAULT_SETTINGS = {
  defaultProvider: "openai" as const,
  modelTiers: { openai: "strong", anthropic: "strong", gemini: "strong" } as const,
};

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, input) => {
    const settings = await ctx.db.query("userSettings").withIndex("by_user", (query) => query.eq("userId", input.userId)).unique();
    return settings ?? { userId: input.userId, ...DEFAULT_SETTINGS, updatedAt: 0 };
  },
});

export const getInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, input) => {
    const settings = await ctx.db.query("userSettings").withIndex("by_user", (query) => query.eq("userId", input.userId)).unique();
    return settings ?? { userId: input.userId, ...DEFAULT_SETTINGS, updatedAt: 0 };
  },
});

export const save = mutation({
  args: {
    userId: v.id("users"),
    defaultProvider: providerValidator,
    modelTiers: modelTiersValidator,
  },
  handler: async (ctx, input) => {
    const existing = await ctx.db.query("userSettings").withIndex("by_user", (query) => query.eq("userId", input.userId)).unique();
    const value = { ...input, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }
    return ctx.db.insert("userSettings", value);
  },
});
