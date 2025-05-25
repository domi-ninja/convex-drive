import { Authenticated, Unauthenticated } from "convex/react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Header from "./Header";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { SignInForm } from "./SignInForm";

export default function App() {
  return (
    <Router>
      <div id="background" className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <Unauthenticated>
            <SignInForm />
          </Unauthenticated>
          <Authenticated>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Authenticated>
        </main>
        <Toaster />
      </div>
    </Router>
  );
}
