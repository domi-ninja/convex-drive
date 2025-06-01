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
    const [urlPath, setUrlPath] = useState<string | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadingCount, setUploadingCount] = useState(0);

    const user = useQuery(api.auth.loggedInUser);

    // Use getFilesAndFoldersRec to get both files and folders
    const folderData = useQuery(api.folders.getFilesAndFoldersRec,
        currentFolderId ? { folderId: currentFolderId } : "skip"
    );

    // Resolve path to folder ID when we have all required data
    const resolvedFolderId = useQuery(api.folders.resolveFolderPath,
        urlPath && user?._id && rootFolderId ? {
            path: urlPath,
            userId: user._id,
            rootFolderId: rootFolderId
        } : "skip"
    );

    // Effect to ensure root folder exists and get its ID
    useEffect(() => {
        async function initRootFolder() {
            if (!user?._id) return;
            try {
                const folderId = await ensureRootFolder({ userId: user._id });
                setRootFolderId(folderId);

                // Check URL pathname for folder path
                const pathFromUrl = window.location.pathname === "/" ? "/" : window.location.pathname;

                if (pathFromUrl !== "/") {
                    setUrlPath(pathFromUrl);
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

    // Handle resolved folder ID from path
    useEffect(() => {
        if (urlPath && resolvedFolderId !== undefined) {
            if (resolvedFolderId) {
                setCurrentFolderId(resolvedFolderId);
            } else {
                // Path not found, default to root and navigate to root
                if (rootFolderId) {
                    setCurrentFolderId(rootFolderId);
                }
                window.history.replaceState({}, '', '/');
            }
            setUrlPath(null); // Clear urlPath after processing
        }
    }, [resolvedFolderId, urlPath, rootFolderId]);

    // Get current folder path for URL updates
    const currentFolderPath = useQuery(api.folders.getFolderPath,
        currentFolderId && rootFolderId ? {
            folderId: currentFolderId,
            rootFolderId: rootFolderId
        } : "skip"
    );

    // Update URL when folder changes
    useEffect(() => {
        if (!rootFolderId || !currentFolderId || currentFolderPath === undefined) return;

        const newPath = currentFolderPath === "/" ? "/" : currentFolderPath;
        if (window.location.pathname !== newPath) {
            window.history.replaceState({}, '', newPath);
        }
    }, [currentFolderPath, rootFolderId]);

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