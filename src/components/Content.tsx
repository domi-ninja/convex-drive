import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInForm } from "../SignInForm";
import { FileManagement } from "./FileManagement";

export function Content() {
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
                        Logged in as: {loggedInUser?.email ?? "anonymous"}
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