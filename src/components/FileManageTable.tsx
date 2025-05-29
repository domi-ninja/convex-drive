import { cleanFileName } from "@/lib/file";
import console from "console";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FileUploadAreaProps } from "./FileUploadArea";

type SortField = 'name' | 'extension' | 'size' | '_creationTime';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

type FileOrFolder = {
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
export function FileManageTable({ fileUploadProps }: { fileUploadProps: FileUploadAreaProps }) {
    const rootFolderId = fileUploadProps.rootFolderId;
    const [selectedFiles, setSelectedFiles] = useState<Set<Id<"files"> | Id<"folders">>>(new Set());
    const [sortField, setSortField] = useState<SortField>('_creationTime');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
    const [renamingThing, setRenamingThing] = useState<RenamingThing | null>(null);
    const deleteFileMutation = useMutation(api.files.deleteFile);
    const deleteFolderMutation = useMutation(api.folders.deleteFolder);
    const renameFileMutation = useMutation(api.files.renameFile);
    const renameFolderMutation = useMutation(api.folders.renameFolder);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState<string>("");
    const downloadFilesAsZipAction = useAction(api.fileActions.downloadFilesAsZip);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const formatFileSize = (bytes?: number) => {
        if (bytes === undefined) return '0 Bytes';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('de-CH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const [filesAndFolders, setFilesAndFolders] = useState<FileOrFolder[]>([]);
    const filesAndFoldersResult = useQuery(api.folders.getFilesAndFoldersRec, {
        folderId: rootFolderId
    });

    useEffect(() => {
        if (!filesAndFoldersResult) return;

        let filesList: FileOrFolder[] = [];
        for (const file of filesAndFoldersResult.files) {
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
        for (const folder of filesAndFoldersResult.folders) {
            filesList.push({
                type: "folder",
                name: folder.name,
                _creationTime: folder._creationTime,
                _id: folder._id,
                url: null,
            });
        }
        setFilesAndFolders(filesList);
    }, [filesAndFoldersResult]);
    //useQuery(api.files.listFilesInFolder, { folderId: rootFolderId }) || [];


    const sortedFiles = [...filesAndFolders].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
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

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

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
        // if (selectedFiles.size === 0) {
        //     toast.info("No files selected for download.");
        //     return;
        // }
        // try {
        //     const fileIds = Array.from(selectedFiles).filter(isFileId);
        //     if (fileIds.length === 0) {
        //         toast.info("No files selected (only folders were selected).");
        //         return;
        //     }
        //     const result = await downloadFilesAsZipAction({
        //         fileIds
        //     }) as { url: string | null; name: string } | undefined;

        //     if (result && result.url) {
        //         const link = document.createElement("a");
        //         link.href = result.url;
        //         link.download = result.name;
        //         document.body.appendChild(link);
        //         link.click();
        //         document.body.removeChild(link);
        //         toast.success("Download started.");
        //     } else {
        //         toast.error("Could not prepare download. The zip might be empty or an error occurred.");
        //     }
        //     setSelectedFiles(new Set());
        // } catch (error) {
        //     console.error("Failed to download files:", error);
        //     toast.error("Failed to download files.");
        // }
    };

    const handleStartRename = (fileId: Id<"files"> | Id<"folders">, currentName: string, type: "file" | "folder") => {
        setRenamingThing({
            id: fileId,
            name: currentName,
            type: type
        });
    };

    const handleSaveRename = async () => {
        if (!renamingThing) {
            return;
        }
        const safeFileName = cleanFileName(renamingThing.name);
        if (!safeFileName || safeFileName.length === 0) {
            toast.error("File name cannot be empty");
            return;
        }

        if (!renamingThing.id) {
            return;
        }

        if (renamingThing.type !== "folder") {
            try {
                await renameFileMutation({
                    fileId: renamingThing.id as Id<"files">,
                    newName: safeFileName,
                });
                toast.success("File renamed successfully");
                setRenamingThing(null);
            } catch (error) {
                console.error("Failed to rename file:", error);
                toast.error("Failed to rename file");
            }
        }
        else {
            try {
                await renameFolderMutation({
                    folderId: renamingThing.id as Id<"folders">,
                    newName: safeFileName,
                });
                toast.success("Folder renamed successfully");
                setRenamingThing(null);
            } catch (error) {
                console.error("Failed to rename folder:", error);
                toast.error("Failed to rename folder");
            }
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
        if (sortField !== field) {
            return <span className="text-gray-400">↕</span>;
        }
        return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
    };

    const IsPreviewable = (type?: string | null) => {
        if (!type) return false;
        return type.startsWith("image/") || type.startsWith("video/");
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

        const folderId = await saveFolderMutation({
            folderId: rootFolderId,
            name: cleanFileName(newFolderName),
            type: "folder",
            size: 0,
        });

        console.log("Folder created:", folderId);

    };

    const handleCreateFolderKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleFinishCreateFolder();
        } else if (e.key === 'Escape') {
            handleCancelCreateFolder();
        }
    };

    return (
        <div className="select-none">

            {filesAndFolders.length > 0 && (
                <div className="pt-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 items-center mb-4 gap-4">
                        <h2 className={`text-2xl font-semibold cursor-pointer p-2  ${selectedFiles.size > 0 ? "bg-gray-200 rounded-md w-fit" : ""}`} onClick={() => setSelectedFiles(new Set())}>
                            {selectedFiles.size > 0 ? (<div>{selectedFiles.size} Files Selected
                                <span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFiles(new Set());
                                        }}
                                        className="ml-2 text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            </div>) : "Your Files"}
                        </h2>

                        <div className="flex items-center gap-2 justify-center lg:justify-center">
                            <div onClick={() => setViewMode("grid")} className={`flex items-center gap-2 cursor-pointer p-4 rounded-md ${viewMode === "grid" ? "bg-gray-200" : ""}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.75h6.5v6.5h-6.5v-6.5zM13.75 4.75h6.5v6.5h-6.5v-6.5zM3.75 13.75h6.5v6.5h-6.5v-6.5zM13.75 13.75h6.5v6.5h-6.5v-6.5z" />
                                </svg>

                                <span className="hidden sm:inline">Grid</span>
                            </div>
                            <div onClick={() => setViewMode("list")} className={`flex items-center gap-2 cursor-pointer p-4 rounded-md ${viewMode === "list" ? "bg-gray-200" : ""}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>

                                <span className="hidden sm:inline">List</span>
                            </div>

                            <div className="flex justify-end gap-2 md:hidden">
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMenuOpen(!isMenuOpen);
                                        }}
                                        className="p-2 rounded-md hover:bg-gray-100"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                                        </svg>
                                    </button>
                                    {isMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadSelected();
                                                    setIsMenuOpen(false);
                                                }}
                                                disabled={selectedFiles.size === 0}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                            <button
                                onClick={handleDownloadSelected}
                                disabled={selectedFiles.size === 0}
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                Download
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={selectedFiles.size === 0}
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                Delete
                            </button>
                        </div>



                    </div>


                    <div className="overflow-x-auto">
                        {viewMode === "list" && (
                            <div>
                                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFiles.size === filesAndFolders.length && filesAndFolders.length > 0}
                                                    onChange={handleSelectAll}
                                                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleSort('name')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Name
                                                    <SortIcon field="name" />
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleSort('extension')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Type
                                                    <SortIcon field="extension" />
                                                </div>
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleSort('size')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Size
                                                    <SortIcon field="size" />
                                                </div>
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleSort('_creationTime')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Upload Date
                                                    <SortIcon field="_creationTime" />
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Preview
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sortedFiles.map((file) => (
                                            <tr
                                                key={file._id}
                                                className={`hover:bg-gray-50 ${selectedFiles.has(file._id) ? 'bg-blue-50' : ''}`}
                                            >
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFiles.has(file._id)}
                                                        onChange={(e) => handleFileSelect(file._id, e)}
                                                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
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
                                                                className="text-sm font-medium text-gray-900 border border-blue-500 rounded px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={handleSaveRename}
                                                                className="text-green-600 hover:text-green-800"
                                                                title="Save"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                onClick={handleCancelRename}
                                                                className="text-red-600 hover:text-red-800"
                                                                title="Cancel"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="text-sm font-medium text-gray-900 max-w-xs cursor-pointer"
                                                            title={file.name}
                                                        >
                                                            <span className="group hover:text-blue-600">
                                                                <span className="group-hover:text-blue-600">{file.name}</span>
                                                                <span className="text-gray-400 group-hover:text-blue-600">
                                                                    {(file.extension && file.extension !== "") ? `.${file.extension}` : ""}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleStartRename(file._id, file.name, file.type as "file" | "folder")}
                                                        className="hover:text-blue-800 w-full hover:bg-blue-100 rounded-md p-1"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                        </svg>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${file.type === "folder" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                                                        {
                                                            file.type === "folder" ? "folder" : file.extension
                                                        }
                                                    </span>
                                                </td>
                                                <td className="px-4 py-1 whitespace-nowrap text-sm text-gray-500">
                                                    {file.type === "folder" ? "" : formatFileSize(file.size)}
                                                </td>
                                                <td className="px-4 py-1 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(file._creationTime)}
                                                </td>
                                                <td className="px-4 whitespace-nowrap">
                                                    {file.url && file.type && file.type.startsWith("image/") ? (
                                                        <img
                                                            src={file.url}
                                                            alt={file.name}
                                                            className="h-8 w-8 object-cover rounded-md border"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 bg-gray-100 rounded-md flex items-center justify-center">
                                                            <span className="text-xs text-gray-500">📄</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div
                                    onClick={() => !isCreatingFolder && handleCreateFolder()}
                                    className="w-fit bg-gray-100 rounded-lg border border-gray-200 p-2 flex items-center gap-2 cursor-pointer hover:bg-gray-200 mt-4 min-w-64"
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-500 flex-shrink-0">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                        </svg>
                                        {isCreatingFolder ? (
                                            <input
                                                type="text"
                                                id="new-folder-name"
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                onBlur={handleCancelCreateFolder}
                                                onKeyDown={handleCreateFolderKeyDown}
                                                className="text-gray-900 border border-blue-500 rounded px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1"
                                                placeholder="Enter folder name"
                                                autoFocus
                                            />
                                        ) : (
                                            <>
                                                <span className=" text-sm text-gray-500">
                                                    Create Folder
                                                </span>
                                            </>
                                        )}
                                    </div>

                                </div>
                            </div>
                        )}
                        {viewMode === "grid" && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                                {sortedFiles.map((file) => (
                                    <div key={file._id} className="bg-white rounded-lg border border-gray-200 w-full">
                                        {IsPreviewable(file.type) && file.url && file.type !== "folder" ? (
                                            <img src={file.url} alt={file.name} className="h-48 w-48 object-contain" />
                                        ) : (
                                            <div className="h-48 bg-gray-100 flex items-center justify-center flex-col gap-2">
                                                <p className="text-sm text-gray-500">{file.type}</p>
                                                <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                                <p className="text-sm text-gray-500">{formatDate(file._creationTime)}</p>
                                            </div>
                                        )}
                                        <div className="flex flex-row gap-2 py-2 w-full flex-wrap text-baseline p-2">
                                            <label className="pr-1">
                                                <input type="checkbox" checked={selectedFiles.has(file._id)} onChange={(e) => handleFileSelect(file._id, e)} className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-1" />
                                            </label>
                                            {renamingThing?.id === file._id ? (
                                                <div className="flex items-center gap-2 flex-1 z-10 bg-white shadow-xl p-4">
                                                    <input
                                                        type="text"
                                                        value={renamingThing?.name}
                                                        onChange={(e) => setRenamingThing(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                        onKeyDown={handleRenameKeyDown}
                                                        onBlur={handleSaveRename}
                                                        className="text-gray-900 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSaveRename}
                                                        className="text-green-600 hover:text-green-800"
                                                        title="Save"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={handleCancelRename}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Cancel"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <h3
                                                    className="text-gray-900 cursor-pointer hover:text-blue-600 break-words break-all"
                                                    onClick={() => handleStartRename(file._id, file.name, file.type as "file" | "folder")}
                                                >
                                                    {file.name}
                                                </h3>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div onClick={() => handleCreateFolder()} className="bg-gray-100 rounded-lg border border-gray-200 w-full p-4 flex items-end gap-2 cursor-pointer hover:bg-gray-200 h-24">
                                    {(isCreatingFolder) ? (
                                        <input
                                            type="text"
                                            id="new-folder-name"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            onBlur={handleCancelCreateFolder}
                                            onKeyDown={handleCreateFolderKeyDown}
                                            className="text-gray-900 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-break"
                                            autoFocus
                                        />
                                    ) : (
                                        <div>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-500">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                            </svg>
                                            <span className="text-gray-500">
                                                Create Folder
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
}