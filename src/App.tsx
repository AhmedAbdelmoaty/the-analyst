import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SoundProvider } from "@/hooks/useSoundEffects";
import { BootLoader } from "@/components/game/BootLoader";
import Index from "./pages/Index";
import Setup from "./pages/Setup";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminLogin from "./pages/AdminLogin";
import AdminBoard from "./pages/AdminBoard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RequireProfile = ({ children }: { children: React.ReactNode }) => {
  const { isProfileComplete, loading, user } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse">جاري التحميل...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isProfileComplete) return <Navigate to="/setup" replace />;
  return <>{children}</>;
};

const RequireUser = ({ children }: { children: React.ReactNode }) => {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SoundProvider>
            <BootLoader>
              <Routes>
                {/* Player routes — login required */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/setup" element={<RequireUser><Setup /></RequireUser>} />
                <Route path="/" element={
                  <RequireProfile>
                    <Index />
                  </RequireProfile>
                } />

                {/* Hidden admin routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/board-9k2x" element={<AdminBoard />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BootLoader>
          </SoundProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
