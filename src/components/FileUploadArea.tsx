import { splitFileName } from "@/lib/file";
import { useMutation } from "convex/react";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { useFolderContext } from "../contexts/FolderContext";

export function FileUploadArea() {
    const saveFile = useMutation(api.files.saveFile);
    const generateUploadUrl = useMutation(api.files.generateFileUploadUrl);
    const { uploadingCount, isUploading, currentFolderId, setUploadingCount, setIsUploading } = useFolderContext();

    const handleUploadFiles = async (files: FileList) => {

        if (!currentFolderId) {
            toast.error("No folder selected");
            return;
        };

        toast.info(`Uploading ${files.length} files`);

        console.log("currentFolderId", currentFolderId);

        setIsUploading(true);
        setUploadingCount(files.length);
        await Promise.all(Array.from(files).map(async (file) => {
            const newFileUrl = await generateUploadUrl();
            let result;
            try {
                const fileBuffer = await file.arrayBuffer();
                result = await fetch(newFileUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: fileBuffer,
                });
                if (!result.ok) {
                    throw new Error(`Upload failed with status ${result.status}`);
                }
            } catch (error) {
                console.error("File upload failed:", error);
                toast.error(`Failed to upload ${file.name}`);
                setUploadingCount(prev => prev - 1);
                return;
            }
            const { storageId } = await result.json();

            // use js stdblib to get the name and extension
            const { name, extension } = splitFileName(file.name);

            await saveFile({
                storageId,
                name: name,
                type: file.type,
                size: file.size,
                folderId: currentFolderId,
                extension: extension,
                isFolder: false
            });

            setUploadingCount(prev => prev - 1);
        }));
        setIsUploading(false);
    };

    const [isDragging, setIsDragging] = useState(false);
    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }, [setIsDragging]);

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, [setIsDragging]);

    const handleDrop = useCallback(
        async (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);
            await handleUploadFiles(event.dataTransfer.files);
            event.dataTransfer.clearData();
        },
        [setIsDragging, currentFolderId]
    );

    return (
        <div
            className={`py-4 px-4 border-2 ${isDragging ? "border-primary bg-blue-50" : "border-dashed border-gray-300 bg-gray-100"
                } rounded-lg transition-all duration-200`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isUploading ? (
                <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Uploading {uploadingCount} files</span>
                </div>
            ) : (
                <div className="flex justify-center flex-row items-center flex-wrap gap-4">
                    <input
                        type="file"
                        multiple
                        onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                        className="hidden"
                        id="file-upload-input"
                    />
                    <label
                        htmlFor="file-upload-input"
                        className="p-4 bg-primary text-white rounded-md hover:bg-primary-hover cursor-pointer shadow-sm"
                    >
                        Upload Files
                    </label>
                    <span className={isDragging ? "text-primary" : "text-gray-500"}>
                        Drop folders here to upload
                    </span>
                </div>
            )}
            {currentFolderId}
        </div>
    );
} 