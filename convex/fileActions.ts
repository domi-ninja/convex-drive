"use node"; // This file is for Node.js specific actions
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import JSZip from "jszip";
import { Doc, Id } from "./_generated/dataModel";

type DownloadResult = { url: string | null; name: string };

export const downloadFilesAsZip = action({
  args: { fileIds: v.array(v.id("files")) },
  handler: async (ctx, args): Promise<DownloadResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const filesToDownload: Array<Doc<"files">> = [];
    for (const fileId of args.fileIds) {
      // Call the query from the 'files' module
      const file: Doc<"files"> | null = await ctx.runQuery(api.files.getFileForDownload, { fileId });
      if (file && file.userId === userId) {
        filesToDownload.push(file);
      } else {
        console.warn(`User ${userId} attempted to download file ${fileId} they do not own or file does not exist.`);
      }
    }

    if (filesToDownload.length === 0) {
      return { url: null, name: "empty.zip" };
    }

    const zip = new JSZip();
    for (const file of filesToDownload) {
      if (file.storageId) {
        const fileBuffer = await ctx.storage.get(file.storageId);
        if (fileBuffer) {
          zip.file(file.name, fileBuffer);
        }
      }
    }

    const zipContent: ArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
    const zipName: string = filesToDownload.length > 1 ? "files.zip" : `${filesToDownload[0].name}.zip`;

    const zipStorageId = await ctx.storage.store(new Blob([zipContent], { type: "application/zip" }));
    const url = await ctx.storage.getUrl(zipStorageId);

    // Call the internal mutation from the 'files' module
    await ctx.scheduler.runAfter(60000 * 5, internal.files.deleteTemporaryZip, { storageId: zipStorageId });

    return { url, name: zipName };
  },
});
