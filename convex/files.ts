import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
// Removed "use node" and JSZip import as actions are moved
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

async function ensureUniqueName(name: string, existingFiles: Array<Doc<"files">>): Promise<string> {

  let newName = name;
  let safeguard = 0;

  while (safeguard < 1000 && existingFiles.find((file) => file.name === newName) !== undefined) {
    const countDupes = existingFiles.filter(f => {
      // replace _123 from end with nothing
      const match = f.name.match(new RegExp(`${name}_(\\d+)$`));
      if (match) {
        return true;
      }
      return false;
    }).length + 1;
    newName = name + "_" + countDupes;
    safeguard++;
  }

  return newName;
}

export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    folderId: v.id("folders"),
    extension: v.string(),
    isFolder: v.boolean(),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const existingFiles = await ctx.db
      .query("files")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.folderId))
      .collect();
    const name = await ensureUniqueName(args.name, existingFiles);

    await ctx.db.insert("files", {
      storageId: args.storageId,
      name: name,
      type: args.type,
      userId,
      size: args.size,
      folderId: args.folderId,
      extension: args.extension,
    });
  },
});

export type FileWithUrl = Doc<"files"> & { url: string | null };

export const generateFileUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
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


export const listFilesInFolder = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args): Promise<Array<FileWithUrl>> => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.folderId))
      .order("desc")
      .collect();

    return Promise.all(
      files.map(async (file) => ({
        ...file,
        url: (await ctx.storage.getUrl(file.storageId)) || "",
        extension: file.extension || "",
      }))
    );
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
