import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { SignOutButton } from "./SignOutButton";

export default function Header() {
    const loggedInUser = useQuery(api.auth.loggedInUser);
    const { signOut } = useAuthActions();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSignOut = () => {
        void signOut();
        setIsDropdownOpen(false);
    };

    const handleProfileClick = () => {
        // TODO: Navigate to profile page
        console.log("Navigate to profile");
        setIsDropdownOpen(false);
    };

    return (
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
            <h2 className="text-xl font-semibold text-primary">
                Zero Drive
            </h2>
            <div className="flex items-center gap-2">
                <Authenticated>
                    <a href="/profile" className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-2 text-secondary hover:text-secondary-hover hover:bg-gray-50 rounded-md transition-colors"
                        >
                            <span className="">
                                {loggedInUser?.email ?? "anonymous"}
                            </span>
                            <svg
                                className="w-6 h-6 text-gray-500"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            {/* <svg
                                className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg> */}
                        </button>


                        {/* {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                                <div className="px-4 py-2  text-gray-500 border-b border-gray-100">
                                    {loggedInUser?.email ?? "anonymous"}
                                </div>
                                <button
                                    onClick={handleProfileClick}
                                    className="w-full text-left px-4 py-2  text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                    Profile
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full text-left px-4 py-2  text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                    Sign out
                                </button>
                            </div>
                        )} */}
                    </a>
                    <SignOutButton />

                </Authenticated>
            </div>
        </header>
    );
}