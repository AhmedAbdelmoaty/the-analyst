import { Navigate } from 'react-router-dom';
import { applyUpdateIfSafe } from '@/lib/registerAppWorker';
import { useAuth } from '@/contexts/AuthContext';
import { useInstall } from '@/contexts/InstallContext';
import InstallPrompt from '@/components/game/InstallPrompt';
export default function AppEntry() {
  const {user, loading, isProfileComplete} = useAuth();
  const {available, standalone, deferred, guidance} = useInstall();
  // A pending app update is applied here, before entering a round.
  if (applyUpdateIfSafe()) return <div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحديث...</div>;
  if (loading) return <div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحميل...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (!isProfileComplete) return <Navigate to="/setup" replace />;
  if (!standalone && !deferred && (available || !!guidance)) return <InstallPrompt />;
  return <Navigate to="/play" replace />;
}
