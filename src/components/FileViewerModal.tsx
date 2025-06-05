import { useEffect } from "react";
import { FileOrFolder, formatDate, formatFileSize } from "./FileManageTable";


export const renderFileContent = (file: FileOrFolder) => {
    if (!file.url) {
        return (
            <div className="flex items-center justify-center h-96 bg-muted rounded-lg w-full">
                <span className="text-muted-foreground">File not available</span>
            </div>
        );
    }

    if (file.type?.startsWith("image/")) {
        return (
            <img
                src={file.url}
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg w-full"
            />
        );
    }

    if (file.type?.startsWith("video/")) {
        return (
            <video
                src={file.url}
                controls
                className="max-w-full max-h-[70vh] rounded-lg w-full"
            >
                Your browser does not support the video tag.
            </video>
        );
    }

    if (file.type?.startsWith("audio/")) {
        return (
            <div className="flex flex-col items-center gap-4 p-8 w-full">
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
                className="w-full h-[90vh] rounded-lg overflow-hidden"
                title={file.name}
            />
        );
    }

    if (file.type?.startsWith("text/") || file.type === "application/json") {
        return (
            <div className="bg-muted p-4 rounded-lg h-96 overflow-auto w-full">
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
        <div className="flex flex-col items-center gap-4 p-8 bg-muted rounded-lg">
            <div className="text-6xl">📄</div>
            <div className="text-center">
                <p className="text-lg font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                    {file.type} • {formatFileSize(file.size || 0)}
                </p>
            </div>
            <a
                href={file.url}
                download={file.name}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
                Download File
            </a>
        </div>
    );
};

// Modal component moved inside to access helper functions
export function FileViewerModal({ viewingFiles, file, setFile, isOpen, onClose }: {
    viewingFiles: FileOrFolder[];
    file: FileOrFolder | null;
    setFile: (file: FileOrFolder) => void;
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
        } else if (e.key === 'ArrowLeft' || e.key === 'j') {
            onPrevious();
        } else if (e.key === 'ArrowRight' || e.key === 'k') {
            onNext();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [file, viewingFiles, setFile, onClose]);

    const onNext = () => {
        const currentIndex = viewingFiles.findIndex(f => f._id === file._id);
        const nextIndex = (currentIndex + 1) % viewingFiles.length;
        setFile(viewingFiles[nextIndex]);
    };

    const onPrevious = () => {
        const currentIndex = viewingFiles.findIndex(f => f._id === file._id);
        const previousIndex = (currentIndex - 1 + viewingFiles.length) % viewingFiles.length;
        setFile(viewingFiles[previousIndex]);
    };


    return (
        <div
            className="fixed inset-0 bg-background/50 flex items-center justify-start z-50 p-4 flex-col"
            onClick={handleBackdropClick}
        >
            <div className="bg-popover text-popover-foreground rounded-lg max-w-[90vw] max-h-[90vh] overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">{file.name}</h2>
                            <p className="text-sm text-muted-foreground">
                                {file.type} • {formatFileSize(file.size || 0)} • {formatDate(file._creationTime)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 justify-end md:hidden">
                            {file.url && (
                                <a
                                    href={file.url}
                                    download={file.name}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                                    title="Download"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                </a>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                                title="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-row items-center justify-center gap-4 p-4">
                        <button
                            onClick={onPrevious}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                        >
                            Prev
                        </button>
                        <button
                            onClick={onNext}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                    <div className="flex items-center gap-2 justify-end hidden md:flex">
                        {file.url && (
                            <a
                                href={file.url}
                                download={file.name}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                                title="Download"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                            title="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                {renderFileContent(file)}
            </div>
        </div>
    );
};