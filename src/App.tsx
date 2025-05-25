import { Authenticated, useQuery } from "convex/react";
import { Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { SignOutButton } from "./SignOutButton";
import { Content } from "./components/Content";

export default function App() {

  const loggedInUser = useQuery(api.auth.loggedInUser);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Zero Drive</h2>
        <div className="flex items-center gap-2">
          <Authenticated>
            <p className="text-xl text-secondary">
              {loggedInUser?.email ?? "anonymous"}
            </p>
          </Authenticated>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 flex flex-col p-8">
        <div className="w-full max-w-4xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
