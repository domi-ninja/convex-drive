import React, { useCallback, useState } from "react";

interface FileUploadAreaProps {
    onUpload: (files: FileList) => Promise<void>;
}

export function FileUploadArea({
    onUpload,
}: FileUploadAreaProps) {

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
            if (droppedFiles && droppedFiles.length > 0) {
                await onUpload(droppedFiles);
                event.dataTransfer.clearData();
            }
        },
        [setIsDragging, onUpload]
    );

    return (
        <div
            className={`p-6 border-2 ${isDragging ? "border-primary bg-blue-50" : "border-dashed border-gray-500 bg-gray-200"
                } rounded-lg transition-all duration-200`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex justify-center flex-col items-center mb-6 h-60">
                <input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && onUpload(e.target.files)}
                    className="hidden"
                    id="file-upload-input"
                />
                <label
                    htmlFor="file-upload-input"
                    className="p-4 bg-primary text-white rounded-md hover:bg-primary-hover cursor-pointer shadow-sm"
                >
                    Upload Files
                </label>
                <div className="flex items-center my-4 w-full max-w-xs">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="px-3 text-gray-500 text-sm">or</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                <span className={isDragging ? "text-primary" : "text-gray-500"}>
                    Drop files here to upload
                </span>
            </div>

            {isDragging && (
                <div className="text-center py-10 text-primary font-semibold">
                    Drop files here to upload
                </div>
            )}
        </div>
    );
} 