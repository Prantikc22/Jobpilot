import "@/App.css";
import "@/i18n";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import Landing from "@/pages/Landing";

const SignIn = lazy(() => import("@/pages/SignIn"));
const SignUp = lazy(() => import("@/pages/SignUp"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const PricingCheckout = lazy(() => import("@/pages/PricingCheckout"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const SharePage = lazy(() => import("@/pages/SharePage"));

import { AuthProvider } from "@/contexts/AuthContext";

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="w-6 h-6 rounded-full border-2 border-zinc-200 border-t-zinc-700 animate-spin" />
  </div>
);

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pricing-checkout" element={<PricingCheckout />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/share/:token" element={<SharePage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </div>
  );
}

export default App;
