import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { encryptApiKey } from "./lib/crypto";

export const seedLocal = action({
  args: {
    email: v.string(),
    name: v.string(),
    keys: v.array(v.object({ provider: v.string(), key: v.string() })),
  },
  handler: async (ctx, input): Promise<{ userId: Id<"users">; keyCount: number }> => {
    const userId: Id<"users"> = await ctx.runMutation(internal.localUsers.ensureInternal, {
      email: input.email,
      name: input.name,
    });
    for (const entry of input.keys) {
      await ctx.runMutation(internal.apiKeys.upsert, {
        userId,
        provider: entry.provider,
        encryptedKey: await encryptApiKey(entry.key),
        last4: entry.key.slice(-4),
      });
    }
    return { userId, keyCount: input.keys.length };
  },
});
