import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FileCard } from "./FileCard";
import { FileUploadArea } from "./FileUploadArea";

export function FileManagement() {
    const files = useQuery(api.files.listFiles) || [];
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const saveFile = useMutation(api.files.saveFile);
    const deleteFileMutation = useMutation(api.files.deleteFile);
    const downloadFilesAsZipAction = useAction(api.fileActions.downloadFilesAsZip);

    const [selectedFiles, setSelectedFiles] = useState<Set<Id<"files">>>(new Set());
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (fileId: Id<"files">) => {
        setSelectedFiles((prevSelected) => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(fileId)) {
                newSelected.delete(fileId);
            } else {
                newSelected.add(fileId);
            }
            return newSelected;
        });
    };

    const handleUpload = async (uploadedFiles: FileList) => {
        if (!uploadedFiles || uploadedFiles.length === 0) return;

        for (const file of Array.from(uploadedFiles)) {
            try {
                const uploadUrl = await generateUploadUrl();
                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: file,
                });
                const { storageId } = await result.json();
                await saveFile({ storageId, name: file.name, type: file.type, size: file.size });
                toast.success(`Uploaded ${file.name}`);
            } catch (error) {
                console.error("Upload failed for file:", file.name, error);
                toast.error(`Failed to upload ${file.name}`);
            }
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

    return (
        <div>
            <FileUploadArea
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                onUpload={handleUpload}
            />

            <div>
                <button
                    onClick={handleDownloadSelected}
                    disabled={selectedFiles.size === 0}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    Download Selected
                </button>
                <button
                    onClick={handleDownloadSelected}
                    disabled={selectedFiles.size === 0}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    Delete Selected
                </button>
            </div>
            <div className="flex flex-col gap-4 pt-4">
                {!isDragging && files.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        No files yet. Drag and drop files here or use the upload button.
                    </div>
                )}

                {!isDragging && files.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {files.map((file) => (
                            <FileCard
                                key={file._id}
                                file={file}
                                isSelected={selectedFiles.has(file._id)}
                                onSelect={handleFileSelect}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 