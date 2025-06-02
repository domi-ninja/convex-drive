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

    const [rootFolderId, setRootFolderId] = useState<Id<"folders"> | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<Id<"folders"> | null>(null);
    const [initialPath] = useState(window.location.pathname.replace("/folder", "")); // Capture initial path immediately
    const [pendingPath, setPendingPath] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingCount, setUploadingCount] = useState(0);

    const user = useQuery(api.auth.loggedInUser);

    const folderData = useQuery(api.folders.getFilesAndFoldersRec,
        currentFolderId ? { folderId: currentFolderId } : "skip"
    );

    const resolvedFolderId = useQuery(api.folders.resolveFolderPath,
        pendingPath && user?._id && rootFolderId ? {
            path: pendingPath,
            userId: user._id,
            rootFolderId: rootFolderId
        } : "skip"
    );

    const currentFolderPath = useQuery(api.folders.getFolderPath,
        currentFolderId && rootFolderId ? {
            folderId: currentFolderId,
            rootFolderId: rootFolderId
        } : "skip"
    );


    // Initialize root folder
    useEffect(() => {
        if (!user?._id || rootFolderId) return;

        async function init() {
            if (!user?._id) return;

            try {
                const rootFId = await ensureRootFolder({ userId: user._id });
                setRootFolderId(rootFId);
            } catch (error) {
                console.error("Failed to initialize root folder:", error);
                toast.error("Failed to initialize folder structure");
            }
        }

        init();
    }, [user?._id, rootFolderId, ensureRootFolder]);

    // Handle initial path resolution once we have user and root folder
    useEffect(() => {
        if (!user?._id || !rootFolderId || currentFolderId !== null) return;

        if (initialPath === "/") {
            setCurrentFolderId(rootFolderId);
        } else {
            setPendingPath(initialPath);
        }
    }, [user?._id, rootFolderId, currentFolderId, initialPath]);

    // Handle path resolution
    useEffect(() => {
        if (!pendingPath || resolvedFolderId === undefined || !rootFolderId) return;

        if (resolvedFolderId) {
            setCurrentFolderId(resolvedFolderId);
        } else {
            setCurrentFolderId(rootFolderId);
            window.history.replaceState({}, '', '/');
            toast.error("Folder not found");
        }

        setPendingPath(null);
    }, [resolvedFolderId, pendingPath, rootFolderId]);

    // Update URL when folder changes (but not during initial load)
    useEffect(() => {
        if (!currentFolderPath || pendingPath || !currentFolderId) return;

        const newPath = currentFolderPath === "/" ? "/" : currentFolderPath;
        if (window.location.pathname !== newPath) {
            window.history.pushState({}, '', `/folder${newPath}`);
        }
    }, [currentFolderPath, pendingPath, currentFolderId]);

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