import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PlayerAuth from '@/pages/PlayerAuth';
import analystLockup from '@/assets/brand/the-analyst-lockup.png';
import { Button } from '@/components/ui/button';
import { LandingContext } from './LandingContext';
import { GAME_CATALOG, type CatalogGame } from '@/features/discovery/catalog';
import GameCard from '@/features/discovery/GameCard';
import { journeyDestination, onboardingStage, selectedGame, selectGame } from '@/features/discovery/journey';
import { destinationForPlan, readPlanIntent, takePlanIntent } from '@/features/subscription/planIntent';
import '@/styles/discovery.css';

export default function Landing() {
  const { user, loading, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const authArea = useRef<HTMLElement>(null);
  const [choice, setChoice] = useState(() => selectedGame());
  const [highlight, setHighlight] = useState(false);
  const [arrivedSignedOut, setArrivedSignedOut] = useState<boolean | null>(null);
  const redirected = useRef(false);
  useEffect(() => { if (!loading && arrivedSignedOut === null) setArrivedSignedOut(!user); }, [loading, user, arrivedSignedOut]);
  useEffect(() => {
    if (loading || !user || arrivedSignedOut === null || redirected.current) return;
    if (arrivedSignedOut || selectedGame() || readPlanIntent() || onboardingStage() === 'plans') {
      redirected.current = true;
      const fallback = destinationForPlan(isProfileComplete ? takePlanIntent() : readPlanIntent(), isProfileComplete);
      navigate(journeyDestination(isProfileComplete, fallback), { replace: true });
    }
  }, [loading, user, arrivedSignedOut, isProfileComplete, navigate]);
  useEffect(() => {
    if (location.pathname !== '/' || location.hash === '#account') authArea.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [location.pathname, location.hash]);
  useEffect(() => { if (!highlight) return; const timer = setTimeout(() => setHighlight(false), 1600); return () => clearTimeout(timer); }, [highlight]);
  const scrollAuth = () => {
    authArea.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    setHighlight(true);
  };
  const choose = (game: CatalogGame) => {
    selectGame(game.id); setChoice(game);
    if (!loading && user) navigate(journeyDestination(isProfileComplete));
    else scrollAuth();
  };
  return <div dir="rtl" className="auth-theme discovery min-h-[100dvh] bg-background text-foreground">
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-2 sm:px-8">
      <Link to="/" aria-label="The Analyst"><img src={analystLockup} alt="The Analyst" className="h-14 w-auto object-contain" /></Link>
      <nav className="flex items-center gap-2 sm:gap-5" aria-label="القائمة الرئيسية">
        <a href="#games" className="text-sm font-bold">الألعاب</a><Link to="/plans" className="hidden text-sm font-bold sm:block">الخطط</Link>
        <Button className="min-h-10 border-primary px-4 font-bold text-primary" onClick={() => user ? navigate('/app') : (navigate('/login', { replace: true }), scrollAuth())}>{user ? 'ألعابي' : 'تسجيل الدخول'}</Button>
      </nav>
    </header>
    <section className="discovery-hero" aria-labelledby="landing-title">
      <div className="discovery-hero-inner mx-auto grid w-full max-w-7xl items-center gap-7 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-12">
        <div className="discovery-hero-primary">
          <h1 id="landing-title" className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-[3.4rem]">متعة اللعب، وقيمة التعلّم.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 sm:text-lg">تعلّم مهارات التحليل بالألعاب، من خلال تجارب تفاعلية تمنحك مساحة للاستكشاف وتجربة اختياراتك والتعلّم منها. تجربة تجمع بين متعة اللعب وممارسة التفكير التحليلي.</p>
          <Button className="mt-5 min-h-11 border-primary bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90" onClick={() => document.getElementById('games')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}>اكتشف الألعاب <ArrowLeft className="h-4 w-4" /></Button>
        </div>
        <div className="discovery-hero-secondary">
          <h2 className="text-xl font-bold leading-relaxed sm:text-2xl">درّب طريقة تفكيرك… بتجربة تفاعلية.</h2>
          <p className="mt-2 text-sm leading-7 sm:text-base sm:leading-8">استكشف مواقف وتحديات تدعوك إلى طرح أسئلة أفضل، وفحص الأدلة، ومراجعة افتراضاتك قبل الوصول إلى القرار.</p>
        </div>
      </div>
    </section>
    <section id="games" className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9" aria-labelledby="games-heading">
      <div className="border-b border-border pb-4">
        <h2 id="games-heading" className="text-2xl font-bold sm:text-3xl">اختار مغامرتك</h2>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">استكشف تجارب تفاعلية مختلفة، واختار الحكاية اللي تحب تبدأ بيها.</p>
      </div>
      <div className="discovery-grid mt-5 grid">{GAME_CATALOG.map(game => <GameCard key={game.id} game={game} onChoose={() => choose(game)} />)}</div>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">المنصة حاليًا في مرحلة التطوير: كل الألعاب متاحة لكل حساب مكتمل، والدفع السنوي لسه مش متاح.</p>
    </section>
    <section ref={authArea} id="account" data-highlight={highlight} className="discovery-auth border-y border-border bg-card" aria-labelledby="account-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-5 px-5 py-7 sm:px-8 sm:py-8 lg:grid-cols-[1fr_430px] lg:gap-12">
        <div><p className="text-sm font-bold text-primary">مغامرتك تبدأ هنا</p><h2 id="account-heading" className="mt-2 text-2xl font-bold leading-relaxed sm:text-3xl">{choice ? `جاهز تبدأ «${choice.title}»؟` : 'حساب واحد، وتجارب متنوعة.'}</h2><p role="status" className="mt-3 text-base leading-8 text-muted-foreground">{choice ? `سجّل حسابك علشان تبدأ مغامرة ${choice.title}. عندك حساب؟ سجّل دخولك وكمّل من هنا.` : 'اعمل حسابك، اختار شخصيتك، وابدأ تكتشف. عندك حساب؟ مغامراتك مستنياك.'}</p><div className="mt-4 border-r-2 border-primary pr-4 text-sm leading-7 text-muted-foreground">تأكيد حسابك بيتم برمز على واتساب. بعد التسجيل لأول مرة هتشوف الخطط قبل ما تبدأ.</div></div>
        <div className="flex min-w-0 justify-center">{loading || arrivedSignedOut === null || (user && arrivedSignedOut) ? <p role="status">جاري التحميل...</p> : user ? <div className="w-full border-t border-border py-8"><h3 className="text-2xl font-bold">أهلاً بيك من جديد</h3><Button className="mt-5 min-h-12 bg-primary px-6 text-primary-foreground" onClick={() => navigate('/app')}>متابعة اللعب <ArrowLeft className="h-4 w-4" /></Button></div> : <LandingContext.Provider value={true}><PlayerAuth /></LandingContext.Provider>}</div>
      </div>
    </section>
    <footer className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4"><img src={analystLockup} alt="The Analyst" className="h-10 w-auto" /><Link to="/plans" className="text-sm font-bold text-primary">استعرض الخطط</Link><div dir="ltr" className="flex items-center gap-3"><span className="text-xs text-muted-foreground">An experience by IMP</span><img src="/imp-footer-logo.png" alt="IMP" className="h-9 w-auto" /></div></div>
      <p className="mt-4 border-t border-border pt-3 text-xs leading-6 text-muted-foreground">نسجّل داخل المنصة أوقات الزيارات والجولات ونتائجها لتحسين التجربة ومتابعة التعلّم. لا نستخدم أدوات تتبع خارجية، ولا نشارك اسمك أو رقمك مع أي طرف ثالث.</p>
    </footer>
  </div>;
}
