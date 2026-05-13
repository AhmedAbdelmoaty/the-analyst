import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export const ProtectedRoute = ({ children, requireProfile = false }: ProtectedRouteProps) => {
  const { user, loading, isProfileComplete } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (requireProfile && !isProfileComplete) return <Navigate to="/setup" replace />;

  return <>{children}</>;
};
