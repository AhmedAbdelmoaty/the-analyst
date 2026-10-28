import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { applyUpdateIfSafe, subscribeUpdate } from "@/lib/registerAppWorker";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { InstallProvider } from "@/contexts/InstallContext";
import Landing from "@/components/auth/Landing";
import AppEntry from "@/pages/AppEntry";
import PlayerAuth from "./pages/PlayerAuth";
import AdminLogin from "./pages/AdminLogin";
import AdminBoard from "./pages/AdminBoard";
import NotFound from "./pages/NotFound";
import VisitTracker from "@/components/analytics/VisitTracker";
import GaPageViews from "@/components/analytics/GaPageViews";
import PlanChoice from "@/pages/PlanChoice";
import MySubscription from "@/pages/MySubscription";
import SubscriptionSummary from "@/pages/SubscriptionSummary";
import WorkDetails from "@/pages/WorkDetails";
import PaymentReturn from "@/pages/PaymentReturn";
import GameGate from "@/features/entitlement/GameGate";

const Setup = lazy(() => import('./pages/Setup'));
const GameRoute = lazy(() => import('./pages/GameRoute'));
const RewardDecisionRoute = lazy(() => import('./pages/RewardDecisionRoute'));
const BehindTheDotsRoute = lazy(() => import('./pages/BehindTheDotsRoute'));
const CrackTheCodeRoute = lazy(() => import('./pages/CrackTheCodeRoute'));
const DecisionMatrixRoute = lazy(() => import('./pages/DecisionMatrixRoute'));
const InvestigationFileRoute = lazy(() => import('./pages/InvestigationFileRoute'));
const AdminStats = lazy(() => import('./pages/AdminStats'));
const AdminPayments = lazy(() => import('./pages/AdminPayments'));
const queryClient = new QueryClient();

const RequireProfile = ({ children }: { children: React.ReactNode }) => {
  const { user, isProfileComplete, loading, profile } = useAuth();
  // Only block on the first load for this user; background refreshes keep the game mounted.
  if (loading && !(user && profile)) return <div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحميل...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (!isProfileComplete) return <Navigate to="/setup" replace />;
  return <>{children}</>;
};
/** Applies a pending installed-app update whenever the player is outside /play. */
const UpdateGate = () => {
  const { pathname } = useLocation();
  useEffect(() => { applyUpdateIfSafe(); }, [pathname]);
  useEffect(() => subscribeUpdate(() => { applyUpdateIfSafe(); }), []);
  return null;
};
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster /><Sonner />
      <BrowserRouter><GaPageViews /><UpdateGate /><AuthProvider><VisitTracker /><InstallProvider>
        <Suspense fallback={<div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحميل...</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Landing />} />
            <Route path="/signup" element={<Landing />} />
            <Route path="/forgot-password" element={<Landing />} />
            <Route path="/app" element={<AppEntry />} />
            <Route path="/plans" element={<PlanChoice />} />
            <Route path="/plans/choose" element={<Navigate to="/plans" replace />} />
            <Route path="/subscription" element={<MySubscription />} />
            <Route path="/subscription/return" element={<PaymentReturn />} />
            {/* Paymob dashboard redirect alias; display-only, never grants access. */}
            <Route path="/checkout/paymob/payment/success" element={<PaymentReturn />} />
            <Route path="/api/acceptance/post_pay" element={<PaymentReturn />} />
            <Route path="/subscription/summary" element={<RequireProfile><SubscriptionSummary /></RequireProfile>} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/profile/work" element={<RequireProfile><WorkDetails /></RequireProfile>} />
            <Route path="/play" element={<RequireProfile><GameRoute /></RequireProfile>} />
            <Route path="/games/reward-decision" element={<RequireProfile><GameGate game="reward-decision"><RewardDecisionRoute /></GameGate></RequireProfile>} />
            <Route path="/games/behind-the-dots" element={<RequireProfile><GameGate game="behind-the-dots"><BehindTheDotsRoute /></GameGate></RequireProfile>} />
            <Route path="/games/crack-the-code" element={<RequireProfile><GameGate game="crack-the-code"><CrackTheCodeRoute /></GameGate></RequireProfile>} />
            <Route path="/games/decision-matrix" element={<RequireProfile><GameGate game="decision-matrix"><DecisionMatrixRoute /></GameGate></RequireProfile>} />
            <Route path="/games/investigation-file" element={<RequireProfile><GameGate game="investigation-file"><InvestigationFileRoute /></GameGate></RequireProfile>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/board-9k2x" element={<AdminBoard />} />
            <Route path="/admin/stats" element={<AdminStats />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </InstallProvider></AuthProvider></BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
