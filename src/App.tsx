import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import React, { useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import Header from "./Header";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { SignInForm } from "./SignInForm";

export interface FileManagerProps {
  uploadingCount: number;
  isUploading: boolean;
  rootFolderId: Id<"folders"> | null;
  currentFolderId: Id<"folders"> | null;
  setCurrentFolderId: (folderId: Id<"folders">) => void;
}

export interface FileUploadProps {
  currentFolderId: Id<"folders"> | null;
  uploadingCount: number;
  isUploading: boolean;
  setUploadingCount: React.Dispatch<React.SetStateAction<number>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function App() {


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
        const folderId = await ensureRootFolder({ userId: user._id });
        setRootFolderId(folderId);
        setCurrentFolderId(folderId);
      } catch (error) {
        console.error("Failed to ensure root folder:", error);
        toast.error("Failed to initialize folder structure");
      }
    }

    initRootFolder();
  }, [user?._id, ensureRootFolder]);



  const fileMgrProps: FileManagerProps = {
    rootFolderId: rootFolderId || null,
    currentFolderId: currentFolderId || rootFolderId,
    uploadingCount,
    isUploading,
    setCurrentFolderId
  };


  const fileUploadProps: FileUploadProps = {
    currentFolderId: currentFolderId || rootFolderId,
    uploadingCount,
    isUploading,
    setUploadingCount,
    setIsUploading
  };

  return (
    <Router>
      <div id="background" className="min-h-screen flex flex-col">
        <Header fileUploadProps={fileUploadProps} />
        <main className="">
          <Unauthenticated>
            <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl pt-24">
              <SignInForm />
            </div>
          </Unauthenticated>
          <Authenticated>
            <Routes>
              <Route path="/" element={<Home fileUploadProps={fileMgrProps} />} />
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

