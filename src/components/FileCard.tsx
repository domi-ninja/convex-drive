import { Id } from "../../convex/_generated/dataModel";
import { FileWithUrl } from "../types";

interface FileCardProps {
    file: FileWithUrl;
    isSelected: boolean;
    onSelect: (fileId: Id<"files">) => void;
}

export function FileCard({ file, isSelected, onSelect }: FileCardProps) {
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div
            className={`p-4 border rounded-lg shadow-sm cursor-pointer transition-all ${isSelected
                ? "ring-2 ring-primary bg-blue-50"
                : "hover:shadow-md"
                }`}
            onClick={() => onSelect(file._id)}
        >
            <div className="flex justify-between items-start">
                <h3 className="font-semibold truncate w-4/5" title={file.name}>
                    {file.name}
                </h3>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(file._id)}
                    className="form-checkbox h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
                />
            </div>
            <p className="text-sm text-gray-500">{file.type}</p>
            <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
            {file.url && (file.type.startsWith("image/") ? (
                <img
                    src={file.url}
                    alt={file.name}
                    className="mt-2 rounded-md max-h-40 object-contain w-full"
                />
            ) : (
                <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block p-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    onClick={(e) => e.stopPropagation()} // Prevent card selection when clicking link
                >
                    View File
                </a>
            ))}
        </div>
    );
} 