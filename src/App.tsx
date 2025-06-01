import { Authenticated, Unauthenticated } from "convex/react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { FolderProvider } from "./contexts/FolderContext";
import Header from "./Header";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { SignInForm } from "./SignInForm";

export default function App() {
  return (
    <Router>
      <div id="background" className="min-h-screen flex flex-col">
        <FolderProvider>
          <Header />
          <main className="">
            <Unauthenticated>
              <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl pt-24">
                <SignInForm />
              </div>
            </Unauthenticated>
            <Authenticated>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/folder/:path/*" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </Authenticated>
          </main>
        </FolderProvider>

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

