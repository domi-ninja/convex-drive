import { Authenticated, useQuery } from "convex/react";
import { useLocation } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { FileUploadArea } from "./components";
import { UserMenu } from "./components/UserMenu";
import { useFolderContext } from "./contexts/FolderContext";

export default function Header() {
    const location = useLocation();
    const {
        // rootFolderId,
        // currentFolderId,
        // setCurrentFolderId,
        files
    } = useFolderContext();
    const isMainRoute = location.pathname === "/" || location.pathname.startsWith("/folder");
    const loggedInUser = useQuery(api.users.viewer);

    if (loggedInUser && !loggedInUser.favoriteColor) {
        loggedInUser.favoriteColor = "red";
    }

    return (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b shadow-sm text-foreground">
            {/* Main header row */}
            <div className="h-14 sm:h-16 flex justify-between items-center px-3 sm:px-4">
                <a href="/" className="text-lg sm:text-xl font-semibold text-foreground hover:text-foreground/90 transition-colors flex-shrink-0">
                    <span className="bg-background text-foreground">Zero Drive</span>
                </a>
                <Authenticated>
                    {(isMainRoute && files && files.length > 10) && (
                        <div className="hidden sm:block">
                            <FileUploadArea />
                        </div>
                    )}
                    <div className="flex items-center">
                        <nav className="flex items-center gap-1 sm:gap-4">

                        </nav>
                        <UserMenu />
                    </div>
                </Authenticated>
            </div>

            {/* Mobile file upload row - appears below main header on mobile only */}
            {/* <Authenticated>
                {isMainRoute && (
                    <div className="sm:hidden px-3 pb-3 pt-1 border-t border-border">
                        <FileUploadArea />
                    </div>
                )}
            </Authenticated> */}
        </header>
    );
}