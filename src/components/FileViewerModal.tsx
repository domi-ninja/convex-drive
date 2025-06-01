import { useEffect } from "react";
import { FileOrFolder, formatDate, formatFileSize } from "./FileManageTable";

// Modal component moved inside to access helper functions
export function FileViewerModal({ file, isOpen, onClose }: {
    file: FileOrFolder | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen || !file || file.type === "folder") return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const renderFileContent = () => {
        if (!file.url) {
            return (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                    <span className="text-gray-500">File not available</span>
                </div>
            );
        }

        if (file.type?.startsWith("image/")) {
            return (
                <img
                    src={file.url}
                    alt={file.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
            );
        }

        if (file.type?.startsWith("video/")) {
            return (
                <video
                    src={file.url}
                    controls
                    className="max-w-full max-h-[70vh] rounded-lg"
                >
                    Your browser does not support the video tag.
                </video>
            );
        }

        if (file.type?.startsWith("audio/")) {
            return (
                <div className="flex flex-col items-center gap-4 p-8">
                    <div className="text-6xl">🎵</div>
                    <audio src={file.url} controls className="w-full max-w-md">
                        Your browser does not support the audio tag.
                    </audio>
                </div>
            );
        }

        if (file.type === "application/pdf") {
            return (
                <iframe
                    src={file.url}
                    className="w-full h-[70vh] rounded-lg"
                    title={file.name}
                />
            );
        }

        if (file.type?.startsWith("text/") || file.type === "application/json") {
            return (
                <div className="bg-gray-100 p-4 rounded-lg h-96 overflow-auto">
                    <iframe
                        src={file.url}
                        className="w-full h-full border-none"
                        title={file.name}
                    />
                </div>
            );
        }

        // Default: show download link
        return (
            <div className="flex flex-col items-center gap-4 p-8 bg-gray-50 rounded-lg">
                <div className="text-6xl">📄</div>
                <div className="text-center">
                    <p className="text-lg font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {file.type} • {formatFileSize(file.size || 0)}
                    </p>
                </div>
                <a
                    href={file.url}
                    download={file.name}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                    Download File
                </a>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{file.name}</h2>
                        <p className="text-sm text-gray-500">
                            {file.type} • {formatFileSize(file.size || 0)} • {formatDate(file._creationTime)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {file.url && (
                            <a
                                href={file.url}
                                download={file.name}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                                title="Download"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                            title="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    {renderFileContent()}
                </div>
            </div>
        </div>
    );
};