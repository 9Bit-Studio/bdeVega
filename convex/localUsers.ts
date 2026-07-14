import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

const args = { email: v.string(), name: v.string() };

export const ensure = mutation({
  args,
  handler: async (ctx, input) => {
    const existing = await ctx.db.query("users").withIndex("email", (query) => query.eq("email", input.email)).unique();
    if (existing) return existing._id;
    return ctx.db.insert("users", { ...input, createdAt: Date.now() });
  },
});

export const ensureInternal = internalMutation({
  args,
  handler: async (ctx, input) => {
    const existing = await ctx.db.query("users").withIndex("email", (query) => query.eq("email", input.email)).unique();
    if (existing) return existing._id;
    return ctx.db.insert("users", { ...input, createdAt: Date.now() });
  },
});
