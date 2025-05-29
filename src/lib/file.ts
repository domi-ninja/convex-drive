import { FileWithUrl } from "@/types";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Folder } from "../../convex/folders";

export const cleanFileName = (fileName: string) => {
    // Remove characters that are not allowed in Windows filenames
    // Windows disallows: < > : " | ? * and control characters (0-31)
    return fileName.trim().replace(/[^a-zA-Z0-9_\-\(\)\[\]\.]/g, "_");
};


export interface FolderWithFiles {
    files: Array<FileWithUrl>;
    folder: Folder;
}


export async function getFilesAndFoldersRec(parentFolderId: Id<"folders">): Promise<FolderWithFiles> {
    const folder = useQuery(api.folders.getFolder, { folderId: parentFolderId });
    if (!folder) {
        throw new Error("Folder not found in getFilesAndFoldersRec, this should not happen");
    }
    const files = useQuery(api.files.listFilesInFolder, { folderId: parentFolderId }) || [];
    return {
        folder: folder,
        files: files,
    };
}