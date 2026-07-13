import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
  apiKeys: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    encryptedKey: v.string(),
    last4: v.string(),
    validatedAt: v.number(),
  }).index("by_user_provider", ["userId", "provider"]),
  userSettings: defineTable({
    userId: v.id("users"),
    defaultProvider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("gemini")),
    modelTiers: v.object({
      openai: v.union(v.literal("fast"), v.literal("strong")),
      anthropic: v.union(v.literal("fast"), v.literal("strong")),
      gemini: v.union(v.literal("fast"), v.literal("strong")),
    }),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  games: defineTable({
    userId: v.id("users"),
    title: v.string(),
    genre: v.string(),
    isPublic: v.boolean(),
    plays: v.optional(v.number()),
    currentVersionId: v.optional(v.id("gameVersions")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_public", ["isPublic"]),
  gameVersions: defineTable({
    gameId: v.id("games"),
    version: v.number(),
    spec: v.any(),
    expectations: v.any(),
    parentVersionId: v.optional(v.id("gameVersions")),
    createdBy: v.union(v.literal("generate"), v.literal("refine"), v.literal("revert")),
    verifyResult: v.any(),
    createdAt: v.number(),
  }).index("by_game", ["gameId", "version"]),
  generationJobs: defineTable({
    gameId: v.optional(v.id("games")),
    userId: v.id("users"),
    status: v.string(),
    stage: v.string(),
    progressLog: v.array(v.string()),
    intent: v.any(),
    answers: v.any(),
    verifyLoops: v.array(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  publishes: defineTable({
    gameId: v.id("games"),
    versionId: v.id("gameVersions"),
    vercelProjectId: v.string(),
    url: v.string(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_game", ["gameId"]),
});
