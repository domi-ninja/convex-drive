import React, { useCallback } from "react";

interface FileUploadAreaProps {
    isDragging: boolean;
    setIsDragging: (isDragging: boolean) => void;
    onUpload: (files: FileList) => Promise<void>;
}

export function FileUploadArea({
    isDragging,
    setIsDragging,
    onUpload,
}: FileUploadAreaProps) {
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
            className={`p-6 border-2 ${isDragging ? "border-primary bg-blue-50" : "border-dashed border-gray-300"
                } rounded-lg transition-all duration-200`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Your Files</h2>
                <div className="flex gap-2">
                    <input
                        type="file"
                        multiple
                        onChange={(e) => e.target.files && onUpload(e.target.files)}
                        className="hidden"
                        id="file-upload-input"
                    />
                    <label
                        htmlFor="file-upload-input"
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover cursor-pointer shadow-sm"
                    >
                        Upload Files
                    </label>

                </div>
            </div>

            {isDragging && (
                <div className="text-center py-10 text-primary font-semibold">
                    Drop files here to upload
                </div>
            )}
        </div>
    );
} 