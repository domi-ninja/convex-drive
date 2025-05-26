import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
// Removed "use node" and JSZip import as actions are moved
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

export const generateUploadUrl = mutation({
  handler: async (ctx): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      type: args.type,
      userId,
      size: args.size,
    });
  },
});

type FileWithUrl = Doc<"files"> & { url: string | null };

export const listFiles = query({
  handler: async (ctx): Promise<Array<FileWithUrl>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const files = await ctx.db
      .query("files")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
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
