"use server";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FileManageTable } from "./FileManageTable";
import { FileUploadAreaProps } from "./FileUploadArea";


export function FileManagement({ fileUploadProps }: { fileUploadProps: FileUploadAreaProps }) {

    const { handleUploadFiles, uploadingCount, isUploading } = fileUploadProps;

    // All hooks must be called before any conditional returns
    const saveFile = useMutation(api.files.saveFile);
    const generateUploadUrl = useMutation(api.files.generateFileUploadUrl);
    const ensureRootFolder = useMutation(api.folders.ensureRootFolder);

    const [rootFolderId, setRootFolderId] = useState<Id<"folders"> | null>(null);

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
        return (
            <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }


    return (
        <div className="p-8">


            <FileManageTable files={files} uploadingCount={uploadingCount}></FileManageTable>
        </div>
    );
} 