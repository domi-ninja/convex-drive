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
                setRootFolderId(folderId);

                // Check URL for folder parameter
                const urlParams = new URLSearchParams(window.location.search);
                const urlFolderId = urlParams.get('folder');

                if (urlFolderId) {
                    // Use folder from URL if provided
                    setCurrentFolderId(urlFolderId as Id<"folders">);
                } else {
                    // Default to root folder
                    setCurrentFolderId(folderId);
                }
            } catch (error) {
                console.error("Failed to ensure root folder:", error);
                toast.error("Failed to initialize folder structure");
            }
        }

        initRootFolder();
    }, [user?._id, ensureRootFolder]);

    // Update URL when folder changes
    useEffect(() => {
        if (!rootFolderId || !currentFolderId) return;

        const url = new URL(window.location.href);
        if (currentFolderId !== rootFolderId) {
            url.searchParams.set('folder', currentFolderId);
        } else {
            url.searchParams.delete('folder');
        }
        window.history.replaceState({}, '', url.toString());
    }, [currentFolderId, rootFolderId]);

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