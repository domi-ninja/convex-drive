import { useMutation, useQuery } from "convex/react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface FolderContextType {
    rootFolderId: Id<"folders"> | null;
    currentFolderId: Id<"folders"> | null;
    setCurrentFolderId: (folderId: Id<"folders">) => void;
    uploadingCount: number;
    isUploading: boolean;
    setUploadingCount: React.Dispatch<React.SetStateAction<number>>;
    setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
    files: any;
}

const FolderContext = createContext<FolderContextType | undefined>(undefined);

export function FolderProvider({ children }: { children: React.ReactNode }) {
    const ensureRootFolder = useMutation(api.folders.ensureRootFolder);

    // Store root folder ID for UI logic and current folder for navigation
    const [rootFolderId, setRootFolderId] = useState<Id<"folders"> | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<Id<"folders"> | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadingCount, setUploadingCount] = useState(0);

    const user = useQuery(api.auth.loggedInUser);

    // Use getFilesAndFoldersRec to get both files and folders
    const folderData = useQuery(api.folders.getFilesAndFoldersRec,
        currentFolderId ? { folderId: currentFolderId } : "skip"
    );

    // Effect to ensure root folder exists and get its ID
    useEffect(() => {
        async function initRootFolder() {
            if (!user?._id) return;
            try {
                const folderId = await ensureRootFolder({ userId: user._id });
                // Set both states in a single update to eliminate race condition
                setRootFolderId(folderId);
                setCurrentFolderId(folderId);
            } catch (error) {
                console.error("Failed to ensure root folder:", error);
                toast.error("Failed to initialize folder structure");
            }
        }

        initRootFolder();
    }, [user?._id, ensureRootFolder]);

    const value: FolderContextType = {
        rootFolderId,
        currentFolderId,
        setCurrentFolderId,
        uploadingCount,
        isUploading,
        setUploadingCount,
        setIsUploading,
        files: folderData,
    };

    return (
        <FolderContext.Provider value={value}>
            {children}
        </FolderContext.Provider>
    );
}

export function useFolderContext() {
    const context = useContext(FolderContext);
    if (context === undefined) {
        throw new Error("useFolderContext must be used within a FolderProvider");
    }
    return context;
} 