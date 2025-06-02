"use node"; // This file is for Node.js specific actions
import { v } from "convex/values";
import JSZip from "jszip";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
type DownloadResult = { url: string | null; name: string };

export const downloadFilesAsZip = action({
  args: {
    filesOrFolders: v.array(
      v.object({
        type: v.string(),
        name: v.string(),
        _id: v.union(v.id("files"), v.id("folders")),
      })
    ),
  },
  returns: v.object({
    url: v.string(),
    name: v.string(),
  }),
  handler: async (ctx, args) => {
    const { filesOrFolders } = args;
    const zip = new JSZip();

    const zipRec = async (currentZip: JSZip, folderId: Id<"folders">) => {
      const files = await ctx.runQuery(api.files.listFilesInFolder, { folderId });

      for (const file of files) {
        const blob = await ctx.storage.get(file.storageId);
        if (blob) {
          currentZip.file(file.name, blob);
        }
      }

      const folders = await ctx.runQuery(api.folders.listFoldersInFolder, { folderId });

      for (const folder of folders) {
        await zipRec(currentZip.folder(folder.name) as JSZip, folder._id);
      }
    }

    for (const fileOrFolder of filesOrFolders) {
      if (fileOrFolder.type === "folder") {
        //await zipRec(zip, fileOrFolder._id as Id<"folders">);
      } else {
        // Get file details first to get the storageId
        const fileDoc = await ctx.runQuery(api.folders.getFileForDownload, {
          fileId: fileOrFolder._id as Id<"files">
        });
        if (fileDoc) {
          const fileBlob = await ctx.storage.get(fileDoc.storageId);
          console.log("fileBlob", fileBlob);
          if (fileBlob) {
            zip.file(fileOrFolder.name, fileBlob);
          }
        }
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    return { url: URL.createObjectURL(content), name: "download.zip" };
  }
});
