import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import SubscriptionLayout from '@/features/subscription/SubscriptionLayout';
import { routeForPlanChoice, type PlanIntent } from '@/features/subscription/planIntent';
import AnnualPrice from '@/features/subscription/AnnualPrice';
import { PAYMENT_UI_ENABLED } from '@/features/subscription/paymentApi';
import { finishPlanStep, journeyDestination, onboardingStage, selectedGame } from '@/features/discovery/journey';
import { GAME_CATALOG } from '@/features/discovery/catalog';
import GameCard from '@/features/discovery/GameCard';
import { selectGame } from '@/features/discovery/journey';
import { useGameAccess } from '@/features/entitlement/useGameAccess';
import '@/styles/discovery.css';

export default function PlanChoice() {
  const navigate = useNavigate();
  const { user, loading, isProfileComplete } = useAuth();
  const { snapshot, loading: accessLoading } = useGameAccess();
  const game = selectedGame();
  const firstTime = onboardingStage() === 'plans';
  const development = !PAYMENT_UI_ENABLED && snapshot?.enforcement === false;
  const choose = (intent: PlanIntent) => {
    if (loading || (user && (!snapshot || accessLoading))) return;
    if (!user) { navigate(routeForPlanChoice(intent, false, false)); return; }
    finishPlanStep();
    if (development || intent === 'free') navigate(journeyDestination(isProfileComplete));
    else navigate(routeForPlanChoice(intent, true, isProfileComplete));
  };
  const disabled = loading || Boolean(user && (!snapshot || accessLoading));
  return <SubscriptionLayout publicPage wide>
    <p className="text-sm font-bold text-primary">تجارب The Analyst</p>
    <h1 className="mt-2 text-3xl font-bold leading-snug sm:text-4xl">{firstTime ? 'أهلاً بيك! اختار تجربتك' : 'اختار تجربتك'}</h1>
    <p className="mt-3 leading-7 text-muted-foreground">{game ? `مغامرة «${game.title}» مستنياك بعد اختيار الخطة واستكمال بياناتك.` : 'حساب واحد يفتح لك اللعب والتعلّم بالطريقة اللي تناسبك.'}</p>
    {!PAYMENT_UI_ENABLED && <aside className="mt-5 border-r-2 border-primary bg-primary/5 px-5 py-4 text-sm leading-7">الدفع السنوي لسه مش متاح. حاليًا أثناء التطوير، كل الألعاب متاحة للحسابات المكتملة. اختيار الخطة مش اشتراك مدفوع، ومش هيطلب منك دفع.</aside>}
    <div className="mt-7 grid items-stretch gap-5 md:grid-cols-2">
      <section className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-6">
        <p className="text-sm font-bold text-primary">الخطة المجانية</p><h2 className="mt-2 text-2xl font-bold">ابدأ مجانًا</h2>
        <p className="mt-4 text-4xl font-bold text-primary">0 <span className="text-base text-foreground">جنيه</span></p>
        <ul className="mt-5 flex-1 list-disc space-y-2 pr-5 text-sm leading-7 marker:text-primary"><li>الوصول إلى «اسأل صح» بعد الإطلاق التجاري.</li><li>بدون دفع.</li></ul>
        <Button disabled={disabled} onClick={() => choose('free')} className="mt-6 min-h-12 border-primary font-bold text-primary">ابدأ مجانًا</Button>
      </section>
      <section className="flex min-w-0 flex-col rounded-lg border border-primary/50 bg-card p-6">
        <p className="text-sm font-bold text-primary">الخطة السنوية</p><h2 className="mt-2 text-2xl font-bold">التجربة الكاملة</h2><div className="mt-4"><AnnualPrice /></div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">400 جنيه سنويًا للحساب ذي الموبايل المصري المؤكّد والمؤهّل، و1,200 جنيه لغيره.</p>
        <ul className="mt-5 flex-1 list-disc space-y-2 pr-5 text-sm leading-7 marker:text-primary"><li>كل الألعاب المشمولة في الكتالوج بعد الإطلاق التجاري.</li><li>12 شهر من تأكيد الدفع، والتجديد باختيارك.</li></ul>
        <Button disabled={disabled} onClick={() => choose('annual')} className="mt-6 min-h-12 border-primary bg-primary font-bold text-primary-foreground hover:bg-primary/90">{PAYMENT_UI_ENABLED ? 'اشترك الآن' : 'اختار السنوية وكمّل الاستكشاف'}</Button>
      </section>
    </div>
    {disabled && <p role="status" className="mt-4 text-sm text-muted-foreground">جاري التحقق من الحساب وإتاحة الألعاب...</p>}
    <section className="discovery mt-10 border-t border-border pt-7" aria-labelledby="current-games"><h2 id="current-games" className="text-xl font-bold">خمس مغامرات مستنياك</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{GAME_CATALOG.map(item => <GameCard key={item.id} game={item} onChoose={() => { selectGame(item.id); if (user) navigate(journeyDestination(isProfileComplete)); else navigate('/#account'); }} />)}</div></section>
  </SubscriptionLayout>;
}
