import { createContext, useContext } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import PlayerAuth from "@/pages/PlayerAuth";
import analystLockup from "@/assets/brand/the-analyst-lockup.png";
import impLogo from "@/assets/brand/imp-logo-upload.webp.asset.json";

const LandingContext = createContext(false);
export const useLandingAuth = () => useContext(LandingContext);

export default function Landing() {
  const { user, loading } = useAuth();
  return <div dir="rtl" className="auth-theme min-h-[100dvh] bg-background text-foreground">
    <div className="mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8 lg:px-12">
      <header className="flex items-center justify-between border-b border-border/70 pb-4">
        <Link to="/" aria-label="The Analyst"><img src={analystLockup} alt="The Analyst" className="h-16 w-auto object-contain sm:h-20" /></Link>
        {!loading && user && <Link to="/app" className="rounded-md border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5">متابعة اللعب</Link>}
      </header>
      <main className="grid flex-1 items-start gap-8 py-8 md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(350px,430px)] lg:items-center lg:py-10">
        <div className="max-w-2xl">
          <span className="mb-5 block h-1 w-12 bg-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold leading-[1.45] text-foreground sm:text-4xl lg:text-[2.7rem]">درّب طريقة تفكيرك… بتجربة تفاعلية.</h1>
          <p className="mt-4 max-w-[38rem] text-base leading-8 text-muted-foreground sm:text-lg">استكشف مواقف وتحديات تدعوك إلى طرح أسئلة أفضل، وفحص الأدلة، ومراجعة افتراضاتك قبل الوصول إلى القرار.</p>
          <div className="mt-8 hidden max-w-[38rem] border-r-2 border-primary/40 pr-5 lg:block">
            <h2 className="text-xl font-bold text-foreground">متعة اللعب، وقيمة التعلّم.</h2>
            <p className="mt-2 leading-8 text-muted-foreground">تعلّم مهارات التحليل بالألعاب، من خلال تجارب تفاعلية تمنحك مساحة للاستكشاف وتجربة اختياراتك والتعلّم منها. تجربة تجمع بين متعة اللعب وممارسة التفكير التحليلي.</p>
          </div>
        </div>
        <div className="min-w-0">
          {loading ? <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">جاري التحميل...</div> : user ?
            <div className="rounded-lg border border-border bg-card p-7 shadow-sm">
              <h2 className="text-2xl font-bold">مرحبًا بك في The Analyst</h2>
              <Link to="/app" className="mt-6 block rounded-md bg-primary px-5 py-3 text-center font-bold text-primary-foreground">متابعة اللعب</Link>
            </div> :
            <LandingContext.Provider value={true}><PlayerAuth /></LandingContext.Provider>}
        </div>
        <div className="border-r-2 border-primary/40 pr-5 lg:hidden">
          <h2 className="text-xl font-bold">متعة اللعب، وقيمة التعلّم.</h2>
          <p className="mt-2 leading-8 text-muted-foreground">تعلّم مهارات التحليل بالألعاب، من خلال تجارب تفاعلية تمنحك مساحة للاستكشاف وتجربة اختياراتك والتعلّم منها. تجربة تجمع بين متعة اللعب وممارسة التفكير التحليلي.</p>
        </div>
      </main>
      <footer className="flex items-center justify-between gap-4 border-t border-border/70 pt-5" dir="ltr">
        <span className="text-xs text-muted-foreground sm:text-sm">An experience by IMP</span>
        <img src={impLogo.url} alt="IMP" className="h-10 w-auto max-w-[45%] object-contain sm:h-12" />
      </footer>
    </div>
  </div>;
}
