import { query } from "./_generated/server";
import { requireCurrentUser } from "./lib/authz";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUser(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Authenticated user not found");
    return { _id: user._id, name: user.name ?? "Player", email: user.email ?? "" };
  },
});
