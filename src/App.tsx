import { Authenticated, Unauthenticated, useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api"; // This will now include api.fileActions
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import React, { FormEvent, useCallback, useState } from "react";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">My Drive</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-primary mb-4">File Management</h1>
        <Authenticated>
          <p className="text-xl text-secondary">
            Welcome back, {loggedInUser?.email ?? "friend"}! Manage your files below.
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-secondary">Sign in to manage your files.</p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <div className="w-full max-w-md mx-auto">
         <SignInForm />
        </div>
      </Unauthenticated>
      <Authenticated>
        <FileManagement />
      </Authenticated>
    </div>
  );
}

function FileManagement() {
  const files = useQuery(api.files.listFiles) || [];
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const deleteFileMutation = useMutation(api.files.deleteFile);
  // Updated to use api.fileActions
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

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const droppedFiles = event.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        await handleUpload(droppedFiles);
        event.dataTransfer.clearData();
      }
    },
    [generateUploadUrl, saveFile, handleUpload]
  );

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
      const result = await downloadFilesAsZipAction({ fileIds: Array.from(selectedFiles) }) as { url: string | null; name: string } | undefined;
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  return (
    <div
      className={`p-6 border-2 ${
        isDragging ? "border-primary bg-blue-50" : "border-dashed border-gray-300"
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
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            className="hidden"
            id="file-upload-input"
          />
          <label
            htmlFor="file-upload-input"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover cursor-pointer shadow-sm"
          >
            Upload Files
          </label>
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

      {isDragging && (
        <div className="text-center py-10 text-primary font-semibold">
          Drop files here to upload
        </div>
      )}

      {!isDragging && files.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No files yet. Drag and drop files here or use the upload button.
        </div>
      )}

      {!isDragging && files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file._id}
              className={`p-4 border rounded-lg shadow-sm cursor-pointer transition-all ${
                selectedFiles.has(file._id)
                  ? "ring-2 ring-primary bg-blue-50"
                  : "hover:shadow-md"
              }`}
              onClick={() => handleFileSelect(file._id)}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold truncate w-4/5" title={file.name}>{file.name}</h3>
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file._id)}
                  onChange={() => handleFileSelect(file._id)}
                  className="form-checkbox h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
                />
              </div>
              <p className="text-sm text-gray-500">{file.type}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
              {file.url && (file.type.startsWith("image/") ? (
                <img src={file.url} alt={file.name} className="mt-2 rounded-md max-h-40 object-contain w-full" />
              ) : (
                 <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs"
                    onClick={(e) => e.stopPropagation()} // Prevent card selection when clicking link
                  >
                    View File
                  </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
