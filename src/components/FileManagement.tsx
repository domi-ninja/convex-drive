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
    folderId: string;
    body: File;
}

function getFilesForUploadRec(rootFolderId: Id<"folders">, files: File[]): FileRec[] {
    return files.map(file => {
        return {
            name: file.name,
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
    const ensureRootFolder = useMutation(api.folders.ensureRootFolder);
    const user = useQuery(api.auth.loggedInUser);
    const [rootFolderId, setRootFolderId] = useState<Id<"folders"> | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingCount, setUploadingCount] = useState(0);

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
        if (!files || files.length === 0 || !rootFolderId) return;
        setIsUploading(true);
        setUploadingCount(prev => prev + files.length);

        try {
            const filesRec = getFilesForUploadRec(rootFolderId, Array.from(files));

            await Promise.all(filesRec.map(async (file) => {
                try {
                    const convexUrl = import.meta.env.VITE_CONVEX_URL;
                    if (!convexUrl) {
                        throw new Error("Convex URL not found in environment variables");
                    }
                    const upload = await fetch(`${convexUrl}/api/files/upload`, {
                        method: "POST",
                        headers: {
                            "User-File-Name": file.name,
                            "User-File-Type": file.type,
                        },
                        body: file.body,
                    });
                    if (!upload.ok) {
                        throw new Error(`Upload failed with status ${upload.status}`);
                    }
                    const { storageId } = await upload.json();
                    await saveFile({
                        storageId,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        extension: file.name.split(".").pop() || "",
                        folderId: file.folderId as Id<"folders">,
                        isFolder: false,
                    });
                } catch (error) {
                    console.error("Failed to upload file:", error);
                    toast.error(`Failed to upload ${file.name}`);
                } finally {
                    setUploadingCount(prev => prev - 1);
                }
            }));
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Failed to upload files");
        } finally {
            setIsUploading(false);
        }
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