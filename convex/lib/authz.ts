import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

type AuthContext = Pick<QueryCtx | MutationCtx | ActionCtx, "auth">;
type GameOwner = { userId: Id<"users"> } | null;

export async function requireCurrentUser(ctx: AuthContext): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Authentication required");
  return userId;
}

export async function requireGameOwner(
  ctx: AuthContext,
  gameId: Id<"games">,
  game: GameOwner,
): Promise<Id<"users">> {
  const userId = await requireCurrentUser(ctx);
  if (!game) throw new Error("Game not found");
  if (game.userId !== userId) throw new Error("Not authorized to access this game");
  return userId;
}
