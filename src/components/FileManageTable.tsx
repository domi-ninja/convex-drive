import { cleanFileName } from "@/lib/file";
import { FileWithUrl } from "@/types";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type SortField = 'name' | 'type' | 'size' | '_creationTime';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export function FileManageTable({ files, uploadingCount = 0 }: { files: FileWithUrl[]; uploadingCount?: number }) {
    const [selectedFiles, setSelectedFiles] = useState<Set<Id<"files">>>(new Set());
    const [sortField, setSortField] = useState<SortField>('_creationTime');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
    const [editingFileId, setEditingFileId] = useState<Id<"files"> | null>(null);
    const [editingFileName, setEditingFileName] = useState<string>("");
    const [isRenaming, setIsRenaming] = useState(false);
    const deleteFileMutation = useMutation(api.files.deleteFile);
    const renameFileMutation = useMutation(api.files.renameFile);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState<string>("");
    const downloadFilesAsZipAction = useAction(api.fileActions.downloadFilesAsZip);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
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

    const sortedFiles = [...files].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'type':
                aValue = a.type.toLowerCase();
                bValue = b.type.toLowerCase();
                break;
            case 'size':
                aValue = a.size;
                bValue = b.size;
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

    const handleFileSelect = (fileId: Id<"files">, event?: React.ChangeEvent<HTMLInputElement>) => {
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
        if (selectedFiles.size === files.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(files.map(file => file._id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0) {
            toast.info("No files selected for deletion.");
            return;
        }
        const promises = Array.from(selectedFiles).map((fileId) =>
            deleteFileMutation({ fileId })
        );
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
        try {
            const result = await downloadFilesAsZipAction({
                fileIds: Array.from(selectedFiles)
            }) as { url: string | null; name: string } | undefined;

            if (result && result.url) {
                const link = document.createElement("a");
                link.href = result.url;
                link.download = result.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Download started.");
            } else {
                toast.error("Could not prepare download. The zip might be empty or an error occurred.");
            }
            setSelectedFiles(new Set());
        } catch (error) {
            console.error("Failed to download files:", error);
            toast.error("Failed to download files.");
        }
    };

    const handleStartRename = (fileId: Id<"files">, currentName: string) => {
        setEditingFileId(fileId);
        setEditingFileName(currentName);
    };

    const handleSaveRename = async () => {
        const safeFileName = cleanFileName(editingFileName);
        if (!safeFileName || safeFileName.length === 0) {
            toast.error("File name cannot be empty");
            return;
        }

        if (safeFileName === files.find(file => file._id === editingFileId)?.name) {
            // same name, do nothing
            setEditingFileId(null);
            setEditingFileName("");
            return;
        }

        if (!editingFileId) {
            return;
        }

        try {
            await renameFileMutation({
                fileId: editingFileId,
                newName: safeFileName,
            });
            toast.success("File renamed successfully");
            setEditingFileId(null);
            setEditingFileName("");
        } catch (error) {
            console.error("Failed to rename file:", error);
            toast.error("Failed to rename file");
        }
    };

    const handleCancelRename = () => {
        setEditingFileId(null);
        setEditingFileName("");
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

    const IsPreviewable = (type: string | null | undefined) => {
        if (!type) return false;
        return type.startsWith("image/") || type.startsWith("video/");
    };

    const handleCreateFolder = () => {
        setIsCreatingFolder(true);
        setNewFolderName("");
    };

    const handleCancelCreateFolder = () => {
        setIsCreatingFolder(false);
        setNewFolderName("");
    };

    const handleFinishCreateFolder = async () => {
        // TODO: Implement folder creation logic
        console.log("Creating folder:", newFolderName);
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

            {files.length > 0 && (
                <div className="pt-8">
                    <div className="grid grid-cols-3 items-center mb-4">
                        <h2 className={`text-2xl font-semibold cursor-pointer p-2 ${selectedFiles.size > 0 ? "bg-gray-200 rounded-md w-fit" : ""}`} onClick={() => setSelectedFiles(new Set())}>
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

                        <div className="flex items-center gap-2">
                            <div onClick={() => setViewMode("grid")} className={`flex items-center gap-2 cursor-pointer p-4 rounded-md ${viewMode === "grid" ? "bg-gray-200" : ""}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.75h6.5v6.5h-6.5v-6.5zM13.75 4.75h6.5v6.5h-6.5v-6.5zM3.75 13.75h6.5v6.5h-6.5v-6.5zM13.75 13.75h6.5v6.5h-6.5v-6.5z" />
                                </svg>

                                <span>Grid</span>
                            </div>
                            <div onClick={() => setViewMode("list")} className={`flex items-center gap-2 cursor-pointer p-4 rounded-md ${viewMode === "list" ? "bg-gray-200" : ""}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>

                                <span>List</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleDownloadSelected}
                                disabled={selectedFiles.size === 0}
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                Download Selected
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={selectedFiles.size === 0}
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                Delete Selected
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
                                                    checked={selectedFiles.size === files.length && files.length > 0}
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
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleSort('type')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Type
                                                    <SortIcon field="type" />
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
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    {editingFileId === file._id ? (
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <input
                                                                type="text"
                                                                value={editingFileName}
                                                                onChange={(e) => setEditingFileName(e.target.value)}
                                                                onKeyDown={handleRenameKeyDown}
                                                                onBlur={handleSaveRename}
                                                                className="text-sm font-medium text-gray-900 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
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
                                                            className="text-sm font-medium text-gray-900 max-w-xs cursor-pointer hover:text-blue-600"
                                                            title={file.name}
                                                            onClick={() => handleStartRename(file._id, file.name)}
                                                        >
                                                            {file.name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                        {file.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-1 whitespace-nowrap text-sm text-gray-500">
                                                    {formatFileSize(file.size)}
                                                </td>
                                                <td className="px-4 py-1 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(file._creationTime)}
                                                </td>
                                                <td className="px-4 whitespace-nowrap">
                                                    {file.url && file.type.startsWith("image/") ? (
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
                                        {IsPreviewable(file.type) && file.url ? (
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
                                            {editingFileId === file._id ? (
                                                <div className="flex items-center gap-2 flex-1 z-10 bg-white shadow-xl p-4">
                                                    <input
                                                        type="text"
                                                        value={editingFileName}
                                                        onChange={(e) => setEditingFileName(e.target.value)}
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
                                                    onClick={() => handleStartRename(file._id, file.name)}
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