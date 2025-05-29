import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query
} from "./_generated/server";
// Removed "use node" and JSZip import as actions are moved
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

export const saveFolder = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    await ctx.db.insert("folders", {
      name: args.name,
      userId,
      size: args.size,
      folderId: args.folderId || null as any,
    });
  },
});

export type Folder = Doc<"folders">;// & { url: string | null };

export const getFolder = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args): Promise<Folder> => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }
    return folder;
  },
});

export const ensureRootFolder = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<Id<"folders">> => {
    const ROOT = "Root";
    if (!args.userId) {
      throw new Error("User not authenticated");
    }
    let result = await ctx.db.query("folders").withIndex("by_userAndName",
      (q) => q.eq("userId", args.userId).eq("name", ROOT)).first();
    if (!result) {
      const id = await ctx.db.insert("folders", {
        name: ROOT,
        userId: args.userId,
        size: 0,
        folderId: undefined, // Root folder has no parent
      });
      result = await ctx.db.get(id);
    }

    if (!result) {
      throw new Error("Not able to create root folder");
    }

    return result._id;
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== userId) {
      throw new Error("File not found or user not authorized");
    }
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
  },
});

export const renameFile = mutation({
  args: {
    fileId: v.id("files"),
    newName: v.string()
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== userId) {
      throw new Error("File not found or user not authorized");
    }
    if (!args.newName.trim()) {
      throw new Error("File name cannot be empty");
    }
    await ctx.db.patch(args.fileId, { name: args.newName.trim() });
  },
});

export const getFileForDownload = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args): Promise<Doc<"files"> | null> => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return null;
    return file;
  },
});

export const deleteTemporaryZip = internalMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args): Promise<void> => {
    try {
      await ctx.storage.delete(args.storageId);
      console.log(`Temporary zip file ${args.storageId} deleted.`);
    } catch (error) {
      console.error(`Error deleting temporary zip file ${args.storageId}:`, error);
    }
  },
});
