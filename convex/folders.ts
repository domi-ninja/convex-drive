import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query
} from "./_generated/server";
// Removed "use node" and JSZip import as actions are moved
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { FileWithUrl } from "./files";

async function ensureUniqueName(name: string, existingFiles: Array<Doc<"folders">>): Promise<string> {

  let newName = name;
  let safeguard = 0;

  while (safeguard < 1000 && existingFiles.find((folder) => folder.name === newName) !== undefined) {
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


export const saveFolder = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    size: v.number(),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args): Promise<Id<"folders">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== userId) {
        throw new Error("Parent folder not found or user not authorized");
      }
    }

    const existingFolders = await ctx.db
      .query("folders")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.folderId))
      .collect();
    const name = await ensureUniqueName(args.name, existingFolders);

    return await ctx.db.insert("folders", {
      name: name,
      userId,
      size: args.size,
      folderId: args.folderId,
    });
  },
});

export interface FolderWithFiles extends Folder {
  files: Array<FileWithUrl>;
  folders: Array<FolderWithFiles>;
}

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

export const listFoldersInFolder = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args): Promise<Array<Folder>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const parentFolder = await ctx.db.get(args.folderId);
    if (!parentFolder || parentFolder.userId !== userId) {
      return [];
    }
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.folderId))
      .order("desc")
      .collect();

    return Promise.all(
      folders.map(async (folder) => ({
        ...folder,
      }))
    );
  },
});

export const renameFolder = mutation({
  args: {
    folderId: v.id("folders"),
    newName: v.string()
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found or user not authorized");
    }
    if (!args.newName.trim()) {
      throw new Error("Folder name cannot be empty");
    }
    await ctx.db.patch(args.folderId, { name: args.newName.trim() });
  },
});

export const getFolderPathRec = query({
  args: { folderId: v.id("folders") },
  returns: v.array(v.object({
    _id: v.id("folders"),
    _creationTime: v.number(),
    folderId: v.optional(v.id("folders")),
    name: v.string(),
    userId: v.id("users"),
    size: v.number(),
  })),
  handler: async (ctx, args): Promise<Array<Folder>> => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    if (folder.folderId) {
      const parentPath = await ctx.runQuery(api.folders.getFolderPathRec, { folderId: folder.folderId });
      return [...parentPath, folder];
    } else {
      return [folder];
    }
  },
});

export const getFilesAndFoldersRec = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args): Promise<FolderWithFiles> => {
    const parentFolderId = args.folderId;

    const rawFiles = await ctx.db
      .query("files")
      .withIndex("by_folderId", (q) => q.eq("folderId", parentFolderId))
      .collect();

    const files = await Promise.all(rawFiles.map(async (file) => ({
      ...file,
      url: await ctx.storage.getUrl(file.storageId),
    })));

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_folderId", (q) => q.eq("folderId", parentFolderId))
      .collect();

    const foldersWithSubfilesAndFolders = await Promise.all(folders.map(async (folder) => {
      return await ctx.runQuery(api.folders.getFilesAndFoldersRec, { folderId: folder._id });
    }));

    const folder = await ctx.db.get(parentFolderId);
    if (!folder) {
      throw new Error("Folder not found in getFilesAndFoldersRec, this should not happen");
    }

    return {
      ...folder,
      files,
      folders: foldersWithSubfilesAndFolders,
    };
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

export const deleteFolder = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("File not found or user not authorized");
    }
    await ctx.db.delete(args.folderId);
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

export const moveFolder = mutation({
  args: {
    folderId: v.id("folders"),
    targetFolderId: v.optional(v.id("folders"))
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found or user not authorized");
    }

    // Prevent moving a folder into itself or its own descendants
    if (args.targetFolderId) {
      const targetFolder = await ctx.db.get(args.targetFolderId);
      if (!targetFolder || targetFolder.userId !== userId) {
        throw new Error("Target folder not found or user not authorized");
      }

      // Check if target folder is a descendant of the source folder
      let currentFolder = targetFolder;
      while (currentFolder.folderId) {
        if (currentFolder.folderId === args.folderId) {
          throw new Error("Cannot move folder into its own descendant");
        }
        const parentFolder = await ctx.db.get(currentFolder.folderId);
        if (!parentFolder) break;
        currentFolder = parentFolder;
      }
    }

    await ctx.db.patch(args.folderId, { folderId: args.targetFolderId });
  },
});

export const getFileForDownload = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args): Promise<Doc<"files"> | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const file = await ctx.db.get(args.fileId);
    if (!file) return null;
    if (file.userId !== userId) {
      return null;
    }
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

export const findFolderByName = query({
  args: {
    parentFolderId: v.optional(v.id("folders")),
    name: v.string(),
    userId: v.id("users")
  },
  returns: v.union(v.id("folders"), v.null()),
  handler: async (ctx, args): Promise<Id<"folders"> | null> => {
    const folder = await ctx.db
      .query("folders")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.parentFolderId))
      .filter((q) => q.and(
        q.eq(q.field("name"), args.name),
        q.eq(q.field("userId"), args.userId)
      ))
      .first();

    return folder?._id || null;
  },
});

export const resolveFolderPath = query({
  args: {
    path: v.string(),
    userId: v.id("users"),
    rootFolderId: v.id("folders")
  },
  returns: v.union(v.id("folders"), v.null()),
  handler: async (ctx, args): Promise<Id<"folders"> | null> => {
    // Handle root path
    if (args.path === "/" || args.path === "" || args.path === "Root") {
      return args.rootFolderId;
    }

    // Split path and remove empty segments
    const pathSegments = args.path.split('/').filter(segment => segment.length > 0);

    // Start from root folder
    let currentFolderId: Id<"folders"> | null = args.rootFolderId;

    // Traverse path segment by segment
    for (const segment of pathSegments) {
      if (!currentFolderId) return null;

      currentFolderId = await ctx.runQuery(api.folders.findFolderByName, {
        parentFolderId: currentFolderId,
        name: segment,
        userId: args.userId
      });

      if (!currentFolderId) return null;
    }

    return currentFolderId;
  },
});

export const getFolderPath = query({
  args: {
    folderId: v.id("folders"),
    rootFolderId: v.id("folders")
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    // If this is the root folder, return "/"
    if (args.folderId === args.rootFolderId) {
      return "/";
    }

    const folderPath = await ctx.runQuery(api.folders.getFolderPathRec, {
      folderId: args.folderId
    });

    // Skip the root folder and build path from remaining folders
    const pathSegments = folderPath
      .slice(1) // Skip root folder
      .map(folder => folder.name);

    return "/" + pathSegments.join("/");
  },
});
