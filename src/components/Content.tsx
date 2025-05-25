import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInForm } from "../SignInForm";
import { FileManagement } from "./FileMain";

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