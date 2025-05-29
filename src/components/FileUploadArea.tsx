import React, { useCallback, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export interface FileUploadAreaProps {
    handleUploadFiles: (files: FileList) => Promise<void>;
    uploadingCount: number;
    isUploading: boolean;
    rootFolderId: Id<"folders">;
}

export function FileUploadArea({ fileUploadProps }: { fileUploadProps: FileUploadAreaProps }) {

    const { handleUploadFiles, uploadingCount, isUploading, rootFolderId } = fileUploadProps;


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
            const droppedFiles = event.dataTransfer.files;
            await handleUploadFiles(droppedFiles);
            event.dataTransfer.clearData();
        },
        [setIsDragging, handleUploadFiles]
    );

    return (
        <div
            className={`py-2 px-4 border-2 ${isDragging ? "border-primary bg-blue-50" : "border-dashed border-gray-300 bg-gray-100"
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
        </div>
    );
} 