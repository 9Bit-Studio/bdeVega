import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireGameOwner } from "./lib/authz";

export const record = internalMutation({
  args: {
    gameId: v.id("games"),
    versionId: v.id("gameVersions"),
    vercelProjectId: v.string(),
    url: v.string(),
    status: v.string(),
  },
  handler: (ctx, input) => ctx.db.insert("publishes", { ...input, createdAt: Date.now() }),
});

export const publishToVercel = action({
  args: { gameId: v.id("games") },
  handler: async (ctx, input): Promise<{
    url: string;
    dryRun: boolean;
    payload?: {
      name: string;
      files: { file: string; data: string }[];
      projectSettings: { framework: null };
    };
  }> => {
    const current: {
      game: { userId: Id<"users">; currentVersionId?: Id<"gameVersions"> };
      version: { _id: Id<"gameVersions">; spec: unknown; expectations: unknown };
    } | null = await ctx.runQuery(internal.games.getCurrentInternal, { gameId: input.gameId });
    await requireGameOwner(ctx, input.gameId, current?.game as { userId: Id<"users"> } | null);
    if (!current) throw new Error("Game not found");
    const projectName = `vega-${input.gameId.slice(-8)}`;
    const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
    const playUrl = `${appUrl.replace(/\/$/, "")}/play/${input.gameId}`;
    const payload: {
      name: string;
      files: { file: string; data: string }[];
      projectSettings: { framework: null };
    } = {
      name: projectName,
      files: [
        {
          file: "index.html",
          data: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vega Game</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;background:#080b12}</style><iframe src="${playUrl}" title="Vega Game"></iframe>`,
        },
        { file: "spec.json", data: JSON.stringify(current.version.spec) },
        { file: "expectations.json", data: JSON.stringify(current.version.expectations) },
      ],
      projectSettings: { framework: null },
    };

    if (process.env.PUBLISH_DRY_RUN !== "false") {
      console.log("[publish-dry-run]", JSON.stringify(payload));
      const url = `https://${projectName}.dry-run.local`;
      await ctx.runMutation(internal.publish.record, {
        gameId: input.gameId,
        versionId: current.version._id,
        vercelProjectId: `dry-run-${projectName}`,
        url,
        status: "dry-run",
      });
      return { url, dryRun: true, payload };
    }

    const token = process.env.VERCEL_TOKEN;
    if (!token) throw new Error("VERCEL_TOKEN is required when PUBLISH_DRY_RUN is false");
    // Publishing always uses this platform-owned credential. When the token
    // can access more than one Vercel scope, pin it to our team as well.
    const teamId = process.env.VERCEL_TEAM_ID;
    const deployEndpoint = new URL("https://api.vercel.com/v13/deployments");
    if (teamId) deployEndpoint.searchParams.set("teamId", teamId);
    const response = await fetch(deployEndpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Vercel deployment failed with ${response.status}`);
    const deployment = await response.json() as { id: string; url: string };
    const url = `https://${deployment.url}`;
    await ctx.runMutation(internal.publish.record, {
      gameId: input.gameId,
      versionId: current.version._id,
      vercelProjectId: deployment.id,
      url,
      status: "ready",
    });
    return { url, dryRun: false };
  },
});
