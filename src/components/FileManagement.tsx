"use server";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FileManageTable } from "./FileManageTable";
import { FileUploadArea } from "./FileUploadArea";

interface FileRec {
    name: string;
    type: string;
    size: number;
    folderId: Id<"folders">;
    body: File;
    extension: string;
}

function getFrontendFilesForUploadRec(rootFolderId: Id<"folders">, files: File[]): FileRec[] {
    // this will ask the browser what files are inside folders that are uploaded
    return files.map(file => {
        const extension = file.name.split(".").pop();
        const name = file.name.split(".")[0]
        return {
            name: name,
            extension: extension || "",
            type: file.type,
            size: file.size,
            folderId: rootFolderId,
            body: file,
        };
    });
}

export function FileManagement() {

    // All hooks must be called before any conditional returns
    const saveFile = useMutation(api.files.saveFile);
    const generateUploadUrl = useMutation(api.files.generateFileUploadUrl);
    const ensureRootFolder = useMutation(api.folders.ensureRootFolder);

    const [rootFolderId, setRootFolderId] = useState<Id<"folders"> | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingCount, setUploadingCount] = useState(0);

    const user = useQuery(api.auth.loggedInUser);
    // Always call useQuery, but with null for folderId if not available
    const filesQuery = useQuery(api.files.listFilesInFolder,
        rootFolderId ? { folderId: rootFolderId } : "skip"
    );

    const files = filesQuery || [];

    // Effect to ensure root folder exists and get its ID
    useEffect(() => {
        async function initRootFolder() {
            if (!user?._id) return;
            try {
                const folderId = await ensureRootFolder({ userId: user._id });
                setRootFolderId(folderId);
            } catch (error) {
                console.error("Failed to ensure root folder:", error);
                toast.error("Failed to initialize folder structure");
            }
        }

        initRootFolder();
    }, [user?._id, ensureRootFolder]);

    if (!user?._id) {
        return <div>Please log in</div>;
    }


    const handleUploadFiles = async (files: FileList) => {
        if (!rootFolderId) {
            throw new Error("Root folder not found");
        };
        const fileRecs = getFrontendFilesForUploadRec(rootFolderId, Array.from(files));

        Promise.all(Array.from(fileRecs).map(async (file) => {
            const newFileUrl = await generateUploadUrl();
            const result = await fetch(newFileUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file.body,
            });
            const { storageId } = await result.json();
            setUploadingCount(prev => prev + 1);
            setIsUploading(true);
            await saveFile({
                storageId, name:
                    file.name, type: file.type, size: file.size,
                folderId: rootFolderId, extension: file.extension, isFolder: false
            });
            setUploadingCount(prev => prev - 1);
            setIsUploading(false);
        }));
    };


    return (
        <div className="p-8">
            <FileUploadArea
                handleUploadFiles={handleUploadFiles}
                uploadingCount={uploadingCount}
                isUploading={isUploading}
            />

            <FileManageTable files={files} uploadingCount={uploadingCount}></FileManageTable>
        </div>
    );
} 