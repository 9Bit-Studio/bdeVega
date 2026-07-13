import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { encryptApiKey } from "./lib/crypto";

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

async function validateKey(provider: string, key: string): Promise<{ ok: boolean; message?: string }> {
  // Local replay mode never spends tokens, so accept any key without a ping.
  if (process.env.LLM_REPLAY !== "false") return { ok: true };
  try {
    let response: Response;
    if (provider === "openai") {
      response = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${key}` } });
    } else if (provider === "anthropic") {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      });
    } else {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    }
    if (response.ok) return { ok: true };
    if (response.status === 401 || response.status === 403) return { ok: false, message: "That key was rejected by the provider" };
    return { ok: false, message: `Provider responded with ${response.status}` };
  } catch {
    return { ok: false, message: "Could not reach the provider to validate the key" };
  }
}

export const save = action({
  args: {
    userId: v.id("users"),
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("gemini")),
    key: v.string(),
  },
  handler: async (ctx, input): Promise<{ ok: boolean; message?: string }> => {
    const key = input.key.trim();
    if (key.length < 8) return { ok: false, message: "That key looks too short" };
    const validation = await validateKey(input.provider, key);
    if (!validation.ok) return validation;
    await ctx.runMutation(internal.apiKeys.upsert, {
      userId: input.userId,
      provider: input.provider,
      encryptedKey: await encryptApiKey(key),
      last4: key.slice(-4),
    });
    return { ok: true };
  },
});

export const listMasked = query({
  args: { userId: v.id("users") },
  handler: async (ctx, input) => {
    const keys = await ctx.db.query("apiKeys").filter((query) => query.eq(query.field("userId"), input.userId)).collect();
    return keys.map(({ provider, last4, validatedAt }) => ({ provider, last4, validatedAt }));
  },
});
