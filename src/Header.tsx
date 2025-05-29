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
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b shadow-sm">
            {/* Main header row */}
            <div className="h-14 sm:h-16 flex justify-between items-center px-3 sm:px-4">
                <Link to="/" className="text-lg sm:text-xl font-semibold text-primary hover:text-primary-hover transition-colors flex-shrink-0">
                    <span className="">Zero Drive</span>
                </Link>
                <div className="flex items-center gap-2 sm:gap-4 ml-2">
                    <Authenticated>
                        <div className="hidden sm:block">
                            <FileUploadArea
                                handleUploadFiles={handleUploadFiles}
                                uploadingCount={uploadingCount}
                                isUploading={isUploading}
                            />
                        </div>
                        <nav className="flex items-center gap-1 sm:gap-4">
                            <Link
                                to="/profile"
                                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-secondary hover:text-secondary-hover hover:bg-gray-50 rounded-md transition-colors"
                            >
                                <span className="truncate max-w-24 sm:max-w-none">
                                    {loggedInUser?.email ?? "anonymous"}
                                </span>
                                <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            </Link>
                        </nav>
                        <div className="flex-shrink-0">
                            <SignOutButton />
                        </div>
                    </Authenticated>
                </div>
            </div>

            {/* Mobile file upload row - appears below main header on mobile only */}
            <Authenticated>
                <div className="sm:hidden px-3 pb-3 pt-1 border-t border-gray-100">
                    <FileUploadArea
                        handleUploadFiles={handleUploadFiles}
                        uploadingCount={uploadingCount}
                        isUploading={isUploading}
                    />
                </div>
            </Authenticated>
        </header>
    );
}