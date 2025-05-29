import { Authenticated, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { SignOutButton } from "./SignOutButton";
import { FileUploadArea } from "./components";
import { FileUploadAreaProps } from "./components/FileUploadArea";

export default function Header({ fileUploadProps }:
    { fileUploadProps: FileUploadAreaProps }) {

    const { handleUploadFiles, uploadingCount, isUploading } = fileUploadProps;

    const loggedInUser = useQuery(api.auth.loggedInUser);

    return (
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
            <Link to="/" className="text-xl font-semibold text-primary hover:text-primary-hover transition-colors">
                Zero Drive
            </Link>
            <div className="flex items-center gap-4">
                <Authenticated>
                    <FileUploadArea
                        handleUploadFiles={handleUploadFiles}
                        uploadingCount={uploadingCount}
                        isUploading={isUploading}
                    />
                    <nav className="flex items-center gap-4">
                        <Link
                            to="/profile"
                            className="flex items-center gap-2 px-3 py-2 text-secondary hover:text-secondary-hover hover:bg-gray-50 rounded-md transition-colors"
                        >
                            <span>{loggedInUser?.email ?? "anonymous"}</span>
                            <svg
                                className="w-5 h-5 text-gray-500"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </Link>
                    </nav>
                    <SignOutButton />
                </Authenticated>
            </div>
        </header>
    );
}