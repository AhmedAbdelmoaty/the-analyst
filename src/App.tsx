import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { InstallProvider } from "@/contexts/InstallContext";
import Landing from "@/components/auth/Landing";
import AppEntry from "@/pages/AppEntry";
import PlayerAuth from "./pages/PlayerAuth";
import AdminLogin from "./pages/AdminLogin";
import AdminBoard from "./pages/AdminBoard";
import NotFound from "./pages/NotFound";

const Setup = lazy(() => import('./pages/Setup'));
const GameRoute = lazy(() => import('./pages/GameRoute'));
const queryClient = new QueryClient();

const RequireProfile = ({ children }: { children: React.ReactNode }) => {
  const { user, isProfileComplete, loading } = useAuth();
  if (loading) return <div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحميل...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (!isProfileComplete) return <Navigate to="/setup" replace />;
  return <>{children}</>;
};
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster /><Sonner />
      <BrowserRouter><AuthProvider><InstallProvider>
        <Suspense fallback={<div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحميل...</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Landing />} />
            <Route path="/signup" element={<Landing />} />
            <Route path="/forgot-password" element={<Landing />} />
            <Route path="/app" element={<AppEntry />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/play" element={<RequireProfile><GameRoute /></RequireProfile>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/board-9k2x" element={<AdminBoard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </InstallProvider></AuthProvider></BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
