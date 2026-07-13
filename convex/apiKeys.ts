import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    encryptedKey: v.string(),
    last4: v.string(),
  },
  handler: async (ctx, input) => {
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (query) => query.eq("userId", input.userId).eq("provider", input.provider))
      .unique();
    const value = { ...input, validatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }
    return ctx.db.insert("apiKeys", value);
  },
});

export const getEncrypted = internalQuery({
  args: { userId: v.id("users"), provider: v.string() },
  handler: (ctx, input) => ctx.db
    .query("apiKeys")
    .withIndex("by_user_provider", (query) => query.eq("userId", input.userId).eq("provider", input.provider))
    .unique(),
});

export const listMasked = query({
  args: { userId: v.id("users") },
  handler: async (ctx, input) => {
    const keys = await ctx.db.query("apiKeys").filter((query) => query.eq(query.field("userId"), input.userId)).collect();
    return keys.map(({ provider, last4, validatedAt }) => ({ provider, last4, validatedAt }));
  },
});
