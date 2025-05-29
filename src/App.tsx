import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import Header from "./Header";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { SignInForm } from "./SignInForm";

export default function App() {

  // All hooks must be called before any conditional returns
  const saveFile = useMutation(api.files.saveFile);
  const generateUploadUrl = useMutation(api.files.generateFileUploadUrl);
  const ensureRootFolder = useMutation(api.folders.ensureRootFolder);

  const [rootFolderId, setRootFolderId] = useState<Id<"folders"> | null>(null);
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
        const folderId = await ensureRootFolder({ userId: user._id });
        setRootFolderId(folderId);
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
    const fileRecs = getFrontendFilesForUploadRec(rootFolderId, Array.from(files));

    Promise.all(Array.from(fileRecs).map(async (file) => {
      const newFileUrl = await generateUploadUrl();
      const result = await fetch(newFileUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file.body,
      });
      const { storageId } = await result.json();
      setUploadingCount(prev => prev + 1);
      setIsUploading(true);
      await saveFile({
        storageId, name:
          file.name, type: file.type, size: file.size,
        folderId: rootFolderId, extension: file.extension, isFolder: false
      });
      setUploadingCount(prev => prev - 1);
      setIsUploading(false);
    }));
  };

  return (
    <Router>
      <div id="background" className="min-h-screen flex flex-col">
        <Header fileUploadProps={{ handleUploadFiles, uploadingCount, isUploading }} />
        <main className="">
          <Unauthenticated>
            <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl pt-24">
              <SignInForm />
            </div>
          </Unauthenticated>
          <Authenticated>
            <Routes>
              <Route path="/" element={<Home fileUploadProps={{ handleUploadFiles, uploadingCount, isUploading }} />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Authenticated>
        </main>
        <Toaster />
      </div>
    </Router>
  );
}

interface FileUploadRec {
  name: string;
  type: string;
  size: number;
  folderId: Id<"folders">;
  body: File;
  extension: string;
}


function getFrontendFilesForUploadRec(rootFolderId: Id<"folders">, files: File[]): FileUploadRec[] {
  // this will ask the browser what files are inside folders that are uploaded
  return files.map(file => {
    const extension = file.name.split(".").pop();
    const name = file.name.split(".")[0]
    return {
      name: name,
      extension: extension || "",
      type: file.type,
      size: file.size,
      folderId: rootFolderId,
      body: file,
    };
  });
}
