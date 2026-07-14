import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireCurrentUser } from "./lib/authz";

const kindValidator = v.union(v.literal("player"), v.literal("background"), v.literal("music"));
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const audioTypes = new Set(["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"]);

function assertUploadPolicy(kind: "player" | "background" | "music", contentType: string, size: number) {
  const allowed = kind === "music" ? audioTypes : imageTypes;
  const maxBytes = kind === "music" ? 12 * 1024 * 1024 : 8 * 1024 * 1024;
  if (!allowed.has(contentType)) throw new Error(`Unsupported ${kind} content type: ${contentType}`);
  if (size <= 0 || size > maxBytes) throw new Error(`${kind} upload exceeds the ${maxBytes / 1024 / 1024} MB limit`);
}

function assetRoute(id: Id<"assetUploads">) {
  return `/api/assets/${id}`;
}

export const createUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const registerUpload = mutation({
  args: { storageId: v.id("_storage"), kind: kindValidator },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUser(ctx);
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) throw new Error("Uploaded file was not found");
    const contentType = metadata.contentType ?? "application/octet-stream";
    assertUploadPolicy(args.kind, contentType, metadata.size);
    return ctx.db.insert("assetUploads", {
      userId,
      storageId: args.storageId,
      kind: args.kind,
      contentType,
      sizeBytes: metadata.size,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/** Called only by the trusted moderation/scanning worker. */
export const reviewUpload = internalMutation({
  args: {
    uploadId: v.id("assetUploads"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) throw new Error("Upload not found");
    await ctx.db.patch(args.uploadId, {
      status: args.status,
      reviewNote: args.note,
      reviewedAt: Date.now(),
    });
  },
});

function assertApprovedUpload(
  upload: Doc<"assetUploads"> | null,
  userId: Id<"users">,
  kind: "player" | "background" | "music",
) {
  if (!upload || upload.userId !== userId || upload.kind !== kind || upload.status !== "approved") {
    throw new Error(`An approved, user-owned ${kind} upload is required`);
  }
  return upload;
}

export const createPack = mutation({
  args: {
    artDirection: v.string(),
    playerUploadId: v.id("assetUploads"),
    backgroundUploadId: v.id("assetUploads"),
    musicUploadId: v.optional(v.id("assetUploads")),
    playerWidth: v.number(),
    playerHeight: v.number(),
    backgroundWidth: v.number(),
    backgroundHeight: v.number(),
    musicVolume: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUser(ctx);
    assertApprovedUpload(await ctx.db.get(args.playerUploadId), userId, "player");
    assertApprovedUpload(await ctx.db.get(args.backgroundUploadId), userId, "background");
    if (args.musicUploadId) assertApprovedUpload(await ctx.db.get(args.musicUploadId), userId, "music");
    if (!args.artDirection.trim() || args.artDirection.length > 300) throw new Error("Art direction must be 1-300 characters");
    if ([args.playerWidth, args.playerHeight, args.backgroundWidth, args.backgroundHeight].some((value) => value <= 0 || value > 100)) {
      throw new Error("Asset dimensions must be between 0 and 100");
    }
    if (args.musicVolume < 0 || args.musicVolume > 1) throw new Error("Music volume must be between 0 and 1");

    const packId = await ctx.db.insert("assetPacks", { ...args, userId, artDirection: args.artDirection.trim(), createdAt: Date.now() });
    return {
      id: `upload-pack:${packId}`,
      artDirection: args.artDirection.trim(),
      player: { imageUrl: assetRoute(args.playerUploadId), width: args.playerWidth, height: args.playerHeight },
      background: { imageUrl: assetRoute(args.backgroundUploadId), width: args.backgroundWidth, height: args.backgroundHeight },
      audio: { musicUrl: args.musicUploadId ? assetRoute(args.musicUploadId) : null, volume: args.musicVolume },
    };
  },
});

export const resolveApproved = query({
  args: { assetId: v.id("assetUploads") },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.assetId);
    if (!upload || upload.status !== "approved") return null;
    return ctx.storage.getUrl(upload.storageId);
  },
});
