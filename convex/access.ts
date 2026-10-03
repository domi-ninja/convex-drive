import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export async function requireUser(ctx: Pick<QueryCtx, "auth">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("User not authenticated");
  return userId;
}

export async function requireFolder(ctx: QueryCtx, folderId: Id<"folders">) {
  const userId = await requireUser(ctx);
  const folder = await ctx.db.get(folderId);
  if (!folder || folder.userId !== userId) {
    throw new Error("Folder not found or user not authorized");
  }
  return folder;
}
