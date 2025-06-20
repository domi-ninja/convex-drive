import { cleanFileName } from "@/lib/file";
import { useAuthToken } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useFolderContext } from "../contexts/FolderContext";
import { FileTreeModal } from "./FileTreeModal";
import { FileUploadArea } from "./FileUploadArea";
import { FileViewerModal, renderFileContent } from "./FileViewerModal";

type SortField = 'name' | 'extension' | 'size' | '_creationTime';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

type SortCriteria = {
    field: SortField;
    direction: SortDirection;
};

export type FileOrFolder = {
    name: string;
    type?: string;
    size?: number;
    extension?: string;
    _creationTime: number;
    _id: Id<"files"> | Id<"folders">;
    url: string | null;
}

type RenamingThing = {
    id: Id<"files"> | Id<"folders">;
    name: string;
    type: "file" | "folder";
}

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
};


export function FileManageTable() {
    const [selectedFiles, setSelectedFiles] = useState<Set<Id<"files"> | Id<"folders">>>(new Set());
    const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>([{ field: 'extension', direction: 'asc' }, { field: '_creationTime', direction: 'desc' }]);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
    const [renamingThing, setRenamingThing] = useState<RenamingThing | null>(null);
    const [draggedItems, setDraggedItems] = useState<Set<Id<"files"> | Id<"folders">>>(new Set());
    const [dragOverFolder, setDragOverFolder] = useState<Id<"folders"> | null>(null);

    const deleteFileMutation = useMutation(api.files.deleteFile);
    const deleteFolderMutation = useMutation(api.folders.deleteFolder);
    const renameFileMutation = useMutation(api.files.renameFile);
    const renameFolderMutation = useMutation(api.folders.renameFolder);
    const moveFileMutation = useMutation(api.files.moveFile);
    const moveFolderMutation = useMutation(api.folders.moveFolder);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState<string>("");

    const {
        rootFolderId,
        currentFolderId,
        setCurrentFolderId,
        files
    } = useFolderContext();


    const [isMobileMenuOpen, setIsMenuOpen] = useState(false);

    // Modal state management with URL persistence
    const [viewingFile, setViewingFile] = useState<FileOrFolder | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);

    // Convert context files to the expected format
    const [filesAndFolders, setFilesAndFolders] = useState<FileOrFolder[]>([]);

    const token = useAuthToken();
    const getEnvironmentUrls = useAction(api.utils.getEnvironmentUrls);

    useEffect(() => {
        if (!files) return;
        let filesList: FileOrFolder[] = [];
        for (const file of files.files || []) {
            filesList.push({
                type: file.type,
                name: file.name,
                _creationTime: file._creationTime,
                _id: file._id,
                size: file.size,
                extension: file.extension,
                url: file.url,
            });
        }
        for (const folder of files.folders || []) {
            filesList.push({
                type: "folder",
                name: folder.name,
                _creationTime: folder._creationTime,
                _id: folder._id,
                url: null,
            });
        }
        setFilesAndFolders(filesList);
    }, [files]);

    // Initialize modal state from URL on component mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const fileId = urlParams.get('viewFile');
        if (fileId && filesAndFolders.length > 0) {
            const file = filesAndFolders.find(f => f._id === fileId);
            if (file && file.type !== "folder") {
                setViewingFile(file);
                setIsModalOpen(true);
            }
        }
    }, [filesAndFolders]);

    // Update URL when modal state changes
    useEffect(() => {
        const url = new URL(window.location.href);
        if (isModalOpen && viewingFile) {
            url.searchParams.set('viewFile', viewingFile._id);
        } else {
            url.searchParams.delete('viewFile');
        }
        window.history.replaceState({}, '', url.toString());
    }, [isModalOpen, viewingFile]);

    const openFileModal = (file: FileOrFolder) => {
        setViewingFile(file);
        setIsModalOpen(true);
    };

    const closeFileModal = () => {
        setViewingFile(null);
        setIsModalOpen(false);
    };



    const handleSort = (field: SortField) => {
        const existingCriteriaIndex = sortCriteria.findIndex(c => c.field === field);

        if (existingCriteriaIndex !== -1) {
            // Field already exists in sort criteria
            const existingCriteria = sortCriteria[existingCriteriaIndex];
            const newDirection: SortDirection = existingCriteria.direction === 'asc' ? 'desc' : 'asc';

            // Remove the existing criteria and add it to the front with toggled direction
            const newCriteria: SortCriteria[] = [
                { field, direction: newDirection },
                ...sortCriteria.filter(c => c.field !== field)
            ];
            setSortCriteria(newCriteria);
        } else {
            // Field doesn't exist, add it to the front
            setSortCriteria(prev => [{ field, direction: 'asc' }, ...prev]);
        }
    };

    const sortedFiles = [...filesAndFolders].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        for (const { field, direction } of sortCriteria) {
            switch (field) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'extension':
                    aValue = a.extension?.toLowerCase() || "";
                    bValue = b.extension?.toLowerCase() || "";
                    break;
                case 'size':
                    aValue = a.size || 0;
                    bValue = b.size || 0;
                    break;
                case '_creationTime':
                    aValue = a._creationTime;
                    bValue = b._creationTime;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const handleOpenFile = (fileId: Id<"files"> | Id<"folders">, type: "file" | "folder") => {
        if (type !== "folder") {
            const file = filesAndFolders.find(f => f._id === fileId);
            if (file) {
                openFileModal(file);
            }
        } else {
            setCurrentFolderId(fileId as Id<"folders">);
        }
    };

    const handleFileSelect = (fileId: Id<"files"> | Id<"folders">, event?: React.ChangeEvent<HTMLInputElement>) => {
        const currentIndex = sortedFiles.findIndex(file => file._id === fileId);

        if (event?.nativeEvent && 'shiftKey' in event.nativeEvent && event.nativeEvent.shiftKey && lastSelectedIndex !== null) {
            // Range selection
            const startIndex = Math.min(lastSelectedIndex, currentIndex);
            const endIndex = Math.max(lastSelectedIndex, currentIndex);

            setSelectedFiles((prevSelected) => {
                const newSelected = new Set(prevSelected);
                for (let i = startIndex; i <= endIndex; i++) {
                    newSelected.add(sortedFiles[i]._id);
                }
                return newSelected;
            });
        } else {
            // Single selection
            setSelectedFiles((prevSelected) => {
                const newSelected = new Set(prevSelected);
                if (newSelected.has(fileId)) {
                    newSelected.delete(fileId);
                } else {
                    newSelected.add(fileId);
                }
                return newSelected;
            });
            setLastSelectedIndex(currentIndex);
        }
    };

    const handleSelectAll = () => {
        if (selectedFiles.size === filesAndFolders.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(filesAndFolders.map(file => file._id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0) {
            toast.info("No files selected for deletion.");
            return;
        }
        const promises = Array.from(selectedFiles).map((id) => {
            const thing = filesAndFolders.find(file => file._id === id);
            if (!thing) {
                toast.error("File not found");
                return;
            }
            if (thing.type !== "folder") {
                return deleteFileMutation({ fileId: id as Id<"files"> });
            } else {
                return deleteFolderMutation({ folderId: id as Id<"folders"> });
            }
        });
        try {
            await Promise.all(promises);
            toast.success("Selected files deleted.");
            setSelectedFiles(new Set());
        } catch (error) {
            console.error("Failed to delete files:", error);
            toast.error("Failed to delete some files.");
        }
    };

    const handleDownloadSelected = async () => {
        if (selectedFiles.size === 0) {
            toast.info("No files selected for download.");
            return;
        }

        toast.info("Preparing ZIP file...");

        try {
            const selectedItems = filesAndFolders.filter(f => selectedFiles.has(f._id));
            const urls = await getEnvironmentUrls({});
            const convexSiteUrl = urls.CONVEX_SITE_URL;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            // Add Authorization header if token is available
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${convexSiteUrl}/download-zip`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    filesOrFolders: selectedItems.map(f => ({
                        type: f.type!,
                        name: f.name,
                        _id: f._id,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // Extract filename or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = (() => {
                if (!contentDisposition) return 'download.zip';

                // Try to match quoted filename first: filename="filename.ext"
                const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
                if (quotedMatch) return quotedMatch[1];

                // Try to match unquoted filename: filename=filename.ext
                const unquotedMatch = contentDisposition.match(/filename\s*=\s*([^;,\s]+)/i);
                if (unquotedMatch) return unquotedMatch[1];

                return 'download.zip';
            })();

            // Trigger download
            const link = Object.assign(document.createElement("a"), {
                href: url,
                download: filename
            });

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setSelectedFiles(new Set());
        } catch (error) {
            console.error("Failed to download files:", error);
            toast.error("Failed to download files.");
        }
    };

    const handleStartRename = (fileId: Id<"files"> | Id<"folders">, currentName: string, type: "file" | "folder") => {
        setRenamingThing({
            id: fileId,
            name: currentName,
            type: type
        });
    };

    const handleSaveRename = async () => {
        if (!renamingThing) return;

        try {
            const cleanedName = cleanFileName(renamingThing.name);
            if (renamingThing.type !== "folder") {
                await renameFileMutation({
                    fileId: renamingThing.id as Id<"files">,
                    newName: cleanedName
                });
            } else {
                await renameFolderMutation({
                    folderId: renamingThing.id as Id<"folders">,
                    newName: cleanedName
                });
            }
            setRenamingThing(null);
            toast.success(`${renamingThing.type} renamed successfully`);
        } catch (error) {
            console.error(`Failed to rename ${renamingThing.type}:`, error);
            toast.error(`Failed to rename ${renamingThing.type}`);
        }
    };

    const handleCancelRename = () => {
        setRenamingThing(null);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveRename();
        } else if (e.key === 'Escape') {
            handleCancelRename();
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        const sortIndex = sortCriteria.findIndex(c => c.field === field);
        if (sortIndex === -1) {
            return <span className="text-muted-foreground">↕</span>;
        }
        const sort = sortCriteria[sortIndex];
        const priorityNumber = sortCriteria.length > 1 ? sortIndex + 1 : '';
        const arrow = sort.direction === 'asc' ? '↑' : '↓';
        return (
            <span className="text-accent flex items-center gap-1">
                {arrow}
                {priorityNumber && <span className="text-xs bg-accent/20 rounded-full w-4 h-4 flex items-center justify-center">{priorityNumber}</span>}
            </span>
        );
    };

    const handleCreateFolder = async () => {
        setIsCreatingFolder(true);
        setNewFolderName("");
    };

    const handleCancelCreateFolder = () => {
        setIsCreatingFolder(false);
        setNewFolderName("");
    };

    const saveFolderMutation = useMutation(api.folders.saveFolder);
    const handleFinishCreateFolder = async () => {
        if (!currentFolderId) return;

        await saveFolderMutation({
            folderId: currentFolderId,
            name: cleanFileName(newFolderName),
            type: "folder",
            size: 0,
        });
        setIsCreatingFolder(false);
        setNewFolderName("");
    };

    const handleCreateFolderKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleFinishCreateFolder();
        } else if (e.key === 'Escape') {
            handleCancelCreateFolder();
        }
    };

    const currentFolderPath = useQuery(api.folders.getFolderPathRec,
        currentFolderId ? { folderId: currentFolderId } : "skip"
    );

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, fileId: Id<"files"> | Id<"folders">) => {
        // If the dragged item is not selected, select it and clear others
        if (!selectedFiles.has(fileId)) {
            setSelectedFiles(new Set([fileId]));
            setDraggedItems(new Set([fileId]));
        } else {
            // Use all selected files for dragging
            setDraggedItems(new Set(selectedFiles));
        }

        // Set drag data
        e.dataTransfer.setData('text/plain', fileId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e: React.DragEvent, folderId: Id<"folders">) => {
        e.preventDefault();
        setDragOverFolder(folderId);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear drag over if we're leaving the drop zone entirely
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setDragOverFolder(null);
        }
    };

    const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: Id<"folders">, targetFolderName: string) => {
        e.preventDefault();
        setDragOverFolder(null);
        moveFiles(targetFolderId, targetFolderName);
    };

    const moveFiles = async (targetFolderId: Id<"folders">, targetFolderName: string) => {
        if (selectedFiles.size === 0) return;

        try {
            const promises = Array.from(selectedFiles).map((itemId) => {
                const item = filesAndFolders.find(f => f._id === itemId);
                if (!item) return Promise.resolve();

                if (item.type === "folder") {
                    // Don't allow dropping folder into itself
                    if (itemId === targetFolderId) {
                        return Promise.resolve();
                    }
                    return moveFolderMutation({
                        folderId: itemId as Id<"folders">,
                        targetFolderId: targetFolderId
                    });
                } else {
                    return moveFileMutation({
                        fileId: itemId as Id<"files">,
                        targetFolderId: targetFolderId
                    });
                }
            });

            await Promise.all(promises);
            toast.success(`Moved ${selectedFiles.size} item(s) to ${targetFolderName}`);
            setSelectedFiles(new Set());
            setDraggedItems(new Set());
        } catch (error) {
            console.error("Failed to move items:", error);
            toast.error("Failed to move some items");
        }
    }

    const handleDragEnd = () => {
        setDraggedItems(new Set());
        setDragOverFolder(null);
    };

    const handleFiletreemodalNavigate = (folderId: Id<"folders">, folderName: string) => {
        console.log("handleFiletreemodalNavigate", folderId, folderName);
        if (selectedFiles.size > 0) {
            moveFiles(folderId, folderName);
        } else {
            setCurrentFolderId(folderId);
        }
    };

    return (
        <div onClick={() => setIsMenuOpen(false)}>
            {/* className="select-none" */}
            <div className="pt-4">
                <div className="flex justify-between md:grid md:grid-cols-3 items-center mb-4 gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className={`text-2xl font-semibold cursor-pointer p-2`} onClick={() => setSelectedFiles(new Set())}>
                            {(
                                <span>
                                    {currentFolderPath?.map((folder: Doc<"folders">, fidx: number) => (
                                        <span key={folder._id}>
                                            <span className="hover:text-accent cursor-pointer" onClick={() => setCurrentFolderId(folder._id as Id<"folders">)}>
                                                {(folder._id === rootFolderId ? (
                                                    <span>
                                                        <span className="pr-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 inline-block">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                                            </svg>
                                                        </span>
                                                        Files
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {folder._id === currentFolderId ?
                                                            <span className="text-accent">{folder.name}</span>
                                                            :
                                                            <span>{folder.name}</span>
                                                        }
                                                    </span>
                                                ))}
                                            </span>
                                            {(fidx !== currentFolderPath.length - 1) && (
                                                <span className="text-muted-foreground px-1">
                                                    /
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </span>
                            )}
                        </h2>

                        {selectedFiles.size > 0 ? (<button onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFiles(new Set());
                        }} className={`cursor-pointer px-4 py-2 flex items-center gap-2 ${selectedFiles.size > 0 ? "bg-muted text-muted-foreground rounded-md w-fit" : ""}`}>{selectedFiles.size} Files Selected
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>) :
                            (<div>

                            </div>)}
                    </div>
                    <div className="flex items-center gap-2 justify-start lg:justify-center">
                        <div onClick={() => setViewMode("grid")} className={`flex items-center gap-2 cursor-pointer p-4 rounded-md ${viewMode === "grid" ? "bg-muted text-muted-foreground" : ""}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.75h6.5v6.5h-6.5v-6.5zM13.75 4.75h6.5v6.5h-6.5v-6.5zM3.75 13.75h6.5v6.5h-6.5v-6.5zM13.75 13.75h6.5v6.5h-6.5v-6.5z" />
                            </svg>

                            <span className="hidden sm:inline">Grid</span>
                        </div>
                        <div onClick={() => setViewMode("list")} className={`flex items-center gap-2 cursor-pointer p-4 rounded-md ${viewMode === "list" ? "bg-muted text-muted-foreground" : ""}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>

                            <span className="hidden sm:inline">List</span>
                        </div>

                        <div className="flex-1 flex justify-end pr-2 sm:hidden block">
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMenuOpen(!isMobileMenuOpen);
                                    }}
                                    className="p-4 rounded-md hover:bg-muted"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                                    </svg>
                                </button>
                                {isMobileMenuOpen && (
                                    <div className="absolute right-0 w-48 bg-popover text-popover-foreground rounded-md shadow-lg z-10 border border-border">
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            onClick={handleCreateFolder} >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 inline-block">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                            </svg>
                                            New Folder
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsTreeModalOpen(true);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m0-3l-3-3m0 0l-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75" />
                                            </svg>
                                            Move
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadSelected();
                                                setIsMenuOpen(false);
                                            }}
                                            disabled={selectedFiles.size === 0}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                            </svg>
                                            Download
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSelected();
                                                setIsMenuOpen(false);
                                            }}
                                            disabled={selectedFiles.size === 0}
                                            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                            Delete
                                        </button>


                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:flex justify-end gap-2">
                        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" onClick={handleCreateFolder} >

                            <div>

                                <span>
                                    New Folder
                                </span>
                            </div>

                        </button>
                        <button
                            onClick={handleDownloadSelected}
                            disabled={selectedFiles.size === 0}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            Download
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={selectedFiles.size === 0}
                            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            Delete
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsTreeModalOpen(true);
                                setIsMenuOpen(false);
                            }}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50 
                            disabled:cursor-not-allowed shadow-sm disabled:bg-muted"
                        >
                            Move
                        </button>
                    </div>



                </div>


                <div className="overflow-x-auto flex-1 flex flex-col min-h-screen">
                    {viewMode === "list" && (
                        <div>
                            <table className="min-w-full bg-card text-card-foreground border border-border rounded-lg shadow-sm select-none">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedFiles.size === filesAndFolders.length && filesAndFolders.length > 0}
                                                onChange={handleSelectAll}
                                                className="form-checkbox h-4 w-4 text-primary rounded border-input focus:ring-ring"
                                            />
                                        </th>
                                        <th
                                            className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Name
                                                <SortIcon field="name" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted">
                                        </th>
                                        <th
                                            className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort('extension')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Type
                                                <SortIcon field="extension" />
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort('size')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Size
                                                <SortIcon field="size" />
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort('_creationTime')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Created Date
                                                <SortIcon field="_creationTime" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Preview
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {(isCreatingFolder && (
                                        <tr className="">
                                            <td></td>
                                            <td colSpan={2} className="px-4 py-1 whitespace-nowrap">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="text"
                                                        value={newFolderName}
                                                        onChange={(e) => setNewFolderName(e.target.value)}
                                                        onBlur={handleCancelCreateFolder}
                                                        onKeyDown={handleCreateFolderKeyDown}
                                                        className="text-sm font-medium border border-input rounded px-2 focus:outline-none focus:ring-2 focus:ring-ring flex-1"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSaveRename}
                                                        className="text-accent hover:text-accent/90"
                                                        title="Save"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={handleCancelRename}
                                                        className="text-destructive hover:text-destructive/90"
                                                        title="Cancel"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {sortedFiles.map((file) => (
                                        <tr
                                            key={file._id}
                                            className={`hover:bg-muted ${selectedFiles.has(file._id) ? 'bg-accent/10' : ''} ${draggedItems.has(file._id) ? 'opacity-50' : ''}`}
                                            draggable={selectedFiles.has(file._id) || draggedItems.has(file._id)}
                                            onDragStart={(e) => handleDragStart(e, file._id)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <td className="px-4 py-1 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFiles.has(file._id)}
                                                    onChange={(e) => handleFileSelect(file._id, e)}
                                                    className="form-checkbox h-4 w-4 text-primary rounded border-input focus:ring-ring"
                                                />
                                            </td>
                                            <td className="px-4 py-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                                {renamingThing?.id === file._id ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input
                                                            type="text"
                                                            value={renamingThing.name}
                                                            onChange={(e) => setRenamingThing(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                            onKeyDown={handleRenameKeyDown}
                                                            onBlur={handleSaveRename}
                                                            className="text-sm font-medium border border-input rounded px-2 focus:outline-none focus:ring-2 focus:ring-ring flex-1"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={handleSaveRename}
                                                            className="text-accent hover:text-accent/90"
                                                            title="Save"
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={handleCancelRename}
                                                            className="text-destructive hover:text-destructive/90"
                                                            title="Cancel"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`text-sm font-medium max-w-xs cursor-pointer ${file.type === "folder" && dragOverFolder === file._id
                                                            ? "bg-accent/20 border-2 border-accent border-dashed rounded p-2"
                                                            : ""
                                                            }`}
                                                        title={file.name}
                                                        onClick={() => handleOpenFile(file._id, file.type as "file" | "folder")}
                                                        onDragOver={file.type === "folder" ? handleDragOver : undefined}
                                                        onDragEnter={file.type === "folder" ? (e) => handleDragEnter(e, file._id as Id<"folders">) : undefined}
                                                        onDragLeave={file.type === "folder" ? handleDragLeave : undefined}
                                                        onDrop={file.type === "folder" ? (e) => handleDropOnFolder(e, file._id as Id<"folders">, file.name) : undefined}
                                                    >
                                                        <span className="group hover:text-accent">
                                                            <span className="group-hover:text-accent">{file.name}</span>
                                                            <span className="text-muted-foreground group-hover:text-accent">
                                                                {(file.extension && file.extension !== "") ? `.${file.extension}` : ""}
                                                            </span>
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-1 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleStartRename(file._id, file.name, file.type as "file" | "folder")}
                                                    className="hover:text-accent w-full hover:bg-muted rounded-md p-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                    </svg>
                                                </button>
                                            </td>
                                            <td className="px-4 py-1 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${file.type === "folder" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                                                    {
                                                        file.type === "folder" ? "folder" : file.extension
                                                    }
                                                </span>
                                            </td>
                                            <td className="px-4 py-1 whitespace-nowrap text-sm text-muted-foreground">
                                                {file.type === "folder" ? "" : formatFileSize(file.size || 0)}
                                            </td>
                                            <td className="px-4 py-1 whitespace-nowrap text-sm text-muted-foreground">
                                                {formatDate(file._creationTime)}
                                            </td>
                                            <td className="px-4 whitespace-nowrap">
                                                {file.url && file.type && file.type.startsWith("image/") ? (
                                                    <img
                                                        src={file.url}
                                                        alt={file.name}
                                                        className="h-8 w-8 object-cover rounded-sm"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center">
                                                        <span className="text-xs text-muted-foreground">📄</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {viewMode === "grid" && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                            {sortedFiles.map((file) => (
                                <div
                                    key={file._id}
                                    className={`bg-card text-card-foreground rounded-lg border border-border w-full ${draggedItems.has(file._id) ? 'opacity-50' : ''
                                        } ${file.type === "folder" && dragOverFolder === file._id
                                            ? "bg-accent/20 border-2 border-accent border-dashed"
                                            : ""
                                        }`}
                                    draggable={selectedFiles.has(file._id) || draggedItems.has(file._id)}
                                    onDragStart={(e) => handleDragStart(e, file._id)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={file.type === "folder" ? handleDragOver : undefined}
                                    onDragEnter={file.type === "folder" ? (e) => handleDragEnter(e, file._id as Id<"folders">) : undefined}
                                    onDragLeave={file.type === "folder" ? handleDragLeave : undefined}
                                    onDrop={file.type === "folder" ? (e) => handleDropOnFolder(e, file._id as Id<"folders">, file.name) : undefined}
                                >
                                    {file.url && file.type !== "folder" ? (
                                        <div
                                            onClick={() => openFileModal(file)}
                                            className="h-48 bg-muted flex items-center justify-center flex-col gap-2 overflow-hidden">
                                            {renderFileContent(file)}
                                        </div>
                                    ) : (
                                        <div className="h-48 bg-muted flex items-center justify-center flex-col gap-2"
                                            onClick={() => handleOpenFile(file._id, file.type as "file" | "folder")}
                                        >
                                            {file.type === "folder" && (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                                </svg>
                                            )}
                                            {file.size && <p className="text-sm text-muted-foreground">{formatFileSize(file.size || 0)}</p>}
                                        </div>
                                    )}
                                    <div className="flex flex-row gap-2 py-2 w-full flex-wrap text-baseline p-2">
                                        <label className="pr-1">
                                            <input type="checkbox" checked={selectedFiles.has(file._id)} onChange={(e) => handleFileSelect(file._id, e)} className="form-checkbox h-4 w-4 text-primary rounded border-input focus:ring-ring flex-1" />
                                        </label>
                                        {renamingThing?.id === file._id ? (
                                            <div className="flex items-center gap-2 flex-1 z-10 bg-popover text-popover-foreground shadow-xl p-4">
                                                <input
                                                    type="text"
                                                    value={renamingThing?.name}
                                                    onChange={(e) => setRenamingThing(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                    onKeyDown={handleRenameKeyDown}
                                                    onBlur={handleSaveRename}
                                                    className="border border-input rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring flex-1"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveRename}
                                                    className="text-accent hover:text-accent/90"
                                                    title="Save"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={handleCancelRename}
                                                    className="text-destructive hover:text-destructive/90"
                                                    title="Cancel"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <h3
                                                className="cursor-pointer hover:text-accent break-words break-all"
                                                onClick={() => handleStartRename(file._id, file.name, file.type as "file" | "folder")}
                                            >
                                                <span className="group hover:text-accent">
                                                    <span className="group-hover:text-accent">{file.name}</span>
                                                    <span className="text-muted-foreground group-hover:text-accent">
                                                        {(file.extension && file.extension !== "") ? `.${file.extension}` : ""}
                                                    </span>
                                                </span>
                                            </h3>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(isCreatingFolder ? (
                                <div onClick={() => handleCreateFolder()} className="bg-muted rounded-lg border border-border w-full p-4 flex items-end gap-2 cursor-pointer hover:bg-muted/90 h-32">
                                    <div className="flex items-center gap-2 flex-col">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 inline-block">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                        </svg>
                                        <span className="text-accent font-medium text-lg">
                                            New Folder
                                        </span>
                                        {(isCreatingFolder) ? (
                                            <input
                                                type="text"
                                                id="new-folder-name"
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                onBlur={handleCancelCreateFolder}
                                                onKeyDown={handleCreateFolderKeyDown}
                                                className="border border-input rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring text-sm text-break"
                                                autoFocus
                                            />
                                        ) : null}
                                    </div>
                                </div>) : null)}
                        </div>
                    )}


                    <div className="flex flex-col">
                        {filesAndFolders.length === 0 && (
                            <div className="p-8 flex-1 flex items-center justify-center">
                                <div className="text-2xl text-muted-foreground bg-muted rounded-lg border border-border px-8 flex items-center gap-2 min-h-32 w-fit">
                                    <span>
                                        {currentFolderId === rootFolderId ? "No Files yet" : `No Files here`}
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                                    </svg>
                                </div>
                            </div>
                        )}
                        <div className="px-8 flex-1 flex">
                            <FileUploadArea />
                        </div>
                    </div>

                </div>
            </div >
            <FileViewerModal
                file={viewingFile}
                isOpen={isModalOpen}
                onClose={closeFileModal}
                viewingFiles={sortedFiles.filter(file =>
                    file.type !== "folder" &&
                    (selectedFiles.size === 0 || selectedFiles.has(file._id))
                )}
                setFile={setViewingFile}
            />
            <FileTreeModal
                isOpen={isTreeModalOpen}
                onClose={() => setIsTreeModalOpen(false)}
                onNavigate={handleFiletreemodalNavigate}
            />
        </div >
    );
}