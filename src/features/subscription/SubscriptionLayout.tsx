import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import analystLockup from "@/assets/brand/the-analyst-lockup.png";

export default function SubscriptionLayout({ children, publicPage = false, wide = false }: { children: ReactNode; publicPage?: boolean; wide?: boolean }) {
  const { user, loading } = useAuth();
  if (!publicPage && loading) return <div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحميل...</div>;
  if (!publicPage && !user) return <Navigate to="/login" replace />;
  const home = user ? "/app" : "/";
  return <div dir="rtl" className="auth-theme min-h-[100dvh] bg-background text-foreground">
    <div className="mx-auto max-w-5xl px-5 pb-12 pt-5 sm:px-8">
      <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Link to={home} aria-label="The Analyst"><img src={analystLockup} alt="The Analyst" className="h-12 w-auto object-contain sm:h-14" /></Link>
        <Link to={home} className="text-sm font-bold text-primary underline-offset-4 hover:underline">{user ? "الألعاب" : "الرئيسية"}</Link>
      </header>
      <main className={`mx-auto pt-8 sm:pt-12 ${wide ? "max-w-4xl" : "max-w-3xl"}`}>{children}</main>
    </div>
  </div>;
}
