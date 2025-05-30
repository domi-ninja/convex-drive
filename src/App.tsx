import { SignIn } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import Header from "./Header";
import { splitFileName } from "./lib/file";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";

export interface FileManagerProps {
  handleUploadFiles: (files: FileList) => Promise<void>;
  // handleDropUpload: (dataTransfer: DataTransfer) => Promise<void>;
  uploadingCount: number;
  isUploading: boolean;
  rootFolderId: Id<"folders"> | null;
  currentFolderId: Id<"folders"> | null;
  setCurrentFolderId: (folderId: Id<"folders">) => void;
}


export default function App() {

  // All hooks must be called before any conditional returns
  const saveFile = useMutation(api.files.saveFile);
  const generateUploadUrl = useMutation(api.files.generateFileUploadUrl);
  const ensureRootFolder = useMutation(api.folders.ensureRootFolder);

  const [rootFolderId, setRootFolderId] = useState<Id<"folders"> | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<Id<"folders"> | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  const user = useQuery(api.auth.loggedInUser);
  // Always call useQuery, but with null for folderId if not available
  const filesQuery = useQuery(api.files.listFilesInFolder,
    rootFolderId ? { folderId: rootFolderId } : "skip"
  );

  const files = filesQuery || [];

  // Effect to ensure root folder exists and get its ID
  useEffect(() => {
    async function initRootFolder() {
      if (!user?._id) return;
      try {
        const folderId = await ensureRootFolder({ userId: user._id as Id<"users"> });
        setRootFolderId(folderId);
        setCurrentFolderId(folderId);
      } catch (error) {
        console.error("Failed to ensure root folder:", error);
        toast.error("Failed to initialize folder structure");
      }
    }

    initRootFolder();
  }, [user?._id, ensureRootFolder]);


  const handleUploadFiles = async (files: FileList) => {
    if (!rootFolderId) {
      throw new Error("Root folder not found");
    };

    toast.info(`Uploading ${files.length} files`);

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
        storageId, name:
          name,
        type: file.type,
        size: file.size,
        folderId: currentFolderId || rootFolderId,
        extension: extension,
        isFolder: false
      });

      setUploadingCount(prev => prev - 1);
    }));
    setIsUploading(false);
  };

  const fileUploadProps: FileManagerProps = {
    rootFolderId,
    currentFolderId: currentFolderId || rootFolderId,
    handleUploadFiles,
    uploadingCount,
    isUploading,
    setCurrentFolderId
  };

  return (
    <Router>
      <div id="background" className="min-h-screen flex flex-col">
        <Header fileUploadProps={fileUploadProps} />
        <main className="">
          <Unauthenticated>
            <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl pt-24">
              <SignIn />
            </div>
          </Unauthenticated>
          <Authenticated>
            <Routes>
              <Route path="/" element={<Home fileUploadProps={fileUploadProps} />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Authenticated>
        </main>
        {/* <Toaster
          toastOptions={{
            style: {},
            className: '',
            descriptionClassName: '',
          }}
          theme="light"
          position="top-right"
          expand={false}
          richColors={true}
          closeButton={true}
        /> */}

        <Toaster
          toastOptions={{
            style: {
              background: "white",
            },
          }}
          theme="light"
          position="top-right"
          expand={true}
          richColors={true}
          closeButton={false}
        />

      </div>
    </Router>
  );
}

