import { Authenticated, Unauthenticated } from "convex/react";
import { ThemeProvider } from 'next-themes';
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { SignInFormPassword } from "./auth/SignInFormPassword";
import { FolderProvider } from "./contexts/FolderContext";
import Header from "./Header";
import { Home } from "./pages/Home";
import { Profile } from "./pages/settings/Profile";

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Router>
        <div id="background" className="min-h-screen flex flex-col bg-background text-foreground">
          <FolderProvider>
            <Header />
            <main className="">
              <Unauthenticated>
                <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl pt-24">
                  <SignInFormPassword />
                </div>
              </Unauthenticated>
              <Authenticated>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/folder" element={<Home />} />
                  <Route path="/folder/:path/*" element={<Home />} />
                  <Route path="/settings/profile" element={<Profile />} />
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
