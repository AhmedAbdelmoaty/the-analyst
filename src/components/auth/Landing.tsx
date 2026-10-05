import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import PlayerAuth from "@/pages/PlayerAuth";
import analystLockup from "@/assets/brand/the-analyst-lockup.png";

import { LandingContext } from "@/components/auth/LandingContext";

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  // Capture the session as the visitor arrived; a new sign-in should not flash the welcome card.
  const [arrivedSignedOut, setArrivedSignedOut] = useState<boolean | null>(null);
  useEffect(() => {
    if (!loading && arrivedSignedOut === null) setArrivedSignedOut(!user);
  }, [loading, user, arrivedSignedOut]);
  useEffect(() => {
    if (!loading && user && arrivedSignedOut) navigate("/app", { replace: true });
  }, [loading, user, arrivedSignedOut, navigate]);

  return <div dir="rtl" className="auth-theme min-h-[100dvh] bg-background text-foreground">
    <div className="mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 lg:px-12 lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pt-3">
      <header className="flex items-center justify-between border-b border-border/70 pb-2">
        <Link to="/" aria-label="The Analyst"><img src={analystLockup} alt="The Analyst" className="h-14 w-auto object-contain sm:h-16" /></Link>
        {!loading && user && arrivedSignedOut === false && <Link to="/app" className="rounded-md border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5">متابعة اللعب</Link>}
      </header>
      <main className="grid flex-1 content-start items-center gap-5 py-5 md:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(350px,430px)] lg:gap-12 lg:py-2">
        <div className="max-w-2xl">
          <span className="mb-3 block h-1 w-12 bg-primary lg:mb-5" aria-hidden="true" />
          <h1 className="text-3xl font-bold leading-[1.45] text-foreground sm:text-4xl lg:text-[2.7rem]">متعة اللعب، وقيمة التعلّم.</h1>
          <p className="mt-3 max-w-[38rem] text-base leading-8 text-muted-foreground sm:text-lg lg:mt-4">تعلّم مهارات التحليل بالألعاب، من خلال تجارب تفاعلية تمنحك مساحة للاستكشاف وتجربة اختياراتك والتعلّم منها. تجربة تجمع بين متعة اللعب وممارسة التفكير التحليلي.</p>
          <div className="mt-5 max-w-[38rem] border-r-2 border-primary/40 pr-5 lg:mt-7">
            <h2 className="text-xl font-bold text-foreground">درّب طريقة تفكيرك… بتجربة تفاعلية.</h2>
            <p className="mt-2 leading-8 text-muted-foreground">استكشف مواقف وتحديات تدعوك إلى طرح أسئلة أفضل، وفحص الأدلة، ومراجعة افتراضاتك قبل الوصول إلى القرار.</p>
          </div>
        </div>
        <div className="min-w-0">
          {loading || arrivedSignedOut === null || (user && arrivedSignedOut) ? <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">جاري التحميل...</div> : user ?
            <div className="rounded-lg border border-border bg-card p-7 shadow-sm">
              <h2 className="text-2xl font-bold">مرحبًا بك في The Analyst</h2>
              <Link to="/app" className="mt-6 block rounded-md bg-primary px-5 py-3 text-center font-bold text-primary-foreground">متابعة اللعب</Link>
            </div> :
            <LandingContext.Provider value={true}><PlayerAuth /></LandingContext.Provider>}
        </div>
      </main>
      <footer className="flex items-center justify-between gap-4 border-t border-border/70 pt-3 lg:pt-2" dir="ltr">
        <span className="text-xs text-muted-foreground sm:text-sm">An experience by IMP</span>
        <img src="/imp-footer-logo.png" alt="IMP" className="h-10 w-auto max-w-[45%] object-contain sm:h-12" />
      </footer>
    </div>
  </div>;
}
