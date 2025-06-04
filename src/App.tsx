import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { ThemeProvider } from 'next-themes';
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { SignInFormsShowcase } from "./auth/SignInFormsShowcase";
import { FolderProvider } from "./contexts/FolderContext";
import Header from "./Header";
import { Home } from "./pages/Home";
import { DesktopClientManager } from "./pages/settings/DesktopClientMgr";
import { Profile } from "./pages/settings/Profile";

export default function App() {
  const user = useQuery(api.users.viewer);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Router>
        <div id="background" className="min-h-screen flex flex-col">
          <FolderProvider>
            <Header />
            <main className="">
              <Unauthenticated>
                <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl pt-24">
                  <SignInFormsShowcase />
                </div>
              </Unauthenticated>
              <Authenticated>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/folder" element={<Home />} />
                  <Route path="/folder/:path/*" element={<Home />} />
                  <Route path="/settings/profile" element={<Profile />} />
                  <Route path="/settings/clients" element={<DesktopClientManager />} />
                </Routes>
              </Authenticated>
            </main>
          </FolderProvider>

          <Toaster
            toastOptions={{
              style: {
                background: "var(--background)",
                color: "var(--foreground)",
              },
            }}
            theme="system"
            position="top-right"
            expand={true}
            richColors={true}
            closeButton={false}
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}
