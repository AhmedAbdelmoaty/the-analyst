import { Link, useNavigate } from 'react-router-dom';
import { Check, Compass, Crown, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { routeForPlanChoice, type PlanIntent } from '@/features/subscription/planIntent';
import AnnualPrice from '@/features/subscription/AnnualPrice';
import { PAYMENT_UI_ENABLED } from '@/features/subscription/paymentApi';
import { clearSelectedGame } from '@/features/discovery/journey';
import { chooseOnboardingPlan, onboardingFor, finishOnboarding } from '@/features/discovery/onboarding';
import { useGameAccess } from '@/features/entitlement/useGameAccess';
import PlatformHeader from '@/features/platform-shell/PlatformHeader';
import { platformAudio } from '@/features/platform-audio/mixer';

export default function PlanChoice() {
  const navigate = useNavigate();
  const { user, loading, isProfileComplete } = useAuth();
  const { snapshot } = useGameAccess();
  const firstTime = user && onboardingFor(user.id)?.stage === 'plans';
  const choose = (intent: PlanIntent) => {
    if (loading) return; platformAudio.unlock(); platformAudio.play('choice');
    if (user) {
      chooseOnboardingPlan(user.id, intent); clearSelectedGame();
      if (isProfileComplete) {
        const finished = finishOnboarding(user.id);
        if (finished) { navigate(finished); return; }
      }
    }
    navigate(routeForPlanChoice(intent, Boolean(user), isProfileComplete));
  };
  return <div className="platform plans-world" dir="rtl"><div className="platform-container">
    <PlatformHeader home={user ? '/app' : '/'}><Link className="platform-button" to={user ? '/app' : '/'}>{user ? 'الألعاب' : 'الرئيسية'}<ArrowLeft /></Link></PlatformHeader>
    <main className="pass-stage">
      <div className="platform-heading"><p className="platform-kicker">مساحة أكبر للاكتشاف</p><h1>{firstTime ? 'أهلاً بيك! اختار تجربتك' : 'اختار تجربتك'}</h1><p className="platform-muted">ابدأ بسؤال يغيّر تفكيرك… أو افتح باب كل المغامرات.</p></div>
      <div className="pass-grid">
        <section className="pass-card"><div className="pass-icon"><Compass /></div><p className="pass-label">الخطة المجانية</p><h2>ابدأ مجانًا</h2><div className="pass-price"><strong>0</strong> <span>جنيه</span></div>
          <ul className="pass-features"><li><Check />مغامرة «اسأل صح» لتجربة صياغة المشكلات.</li><li><Check />حسابك وشخصيتك، بدون دفع.</li><li><Check />اختار الترقية في الوقت اللي يناسبك.</li></ul>
          <button className="platform-button" disabled={loading} onClick={() => choose('free')}>ابدأ مجانًا<ArrowLeft /></button>
        </section>
        <section className="pass-card annual"><span className="pass-stamp">كل المغامرات</span><div className="pass-icon"><Crown /></div><p className="pass-label">الخطة السنوية</p><h2>التجربة الكاملة</h2><div className="pass-price"><AnnualPrice /></div>
          <ul className="pass-features"><li><Check />الألعاب الست، ومهارات مختلفة في كل حكاية.</li><li><Check />12 شهر من تأكيد الدفع.</li><li><Check />دفع سنوي لمرة واحدة، والتجديد باختيارك.</li></ul>
          <button className="platform-button primary" disabled={loading} onClick={() => choose('annual')}>اختار السنوية<ArrowLeft /></button>
        </section>
      </div>
      <p className="platform-note">{PAYMENT_UI_ENABLED ? 'اختيار السنوية ينقلك لملخص الاشتراك بعد استكمال حسابك. الوصول المدفوع يبدأ بعد تأكيد الدفع، مش بمجرد اختيار الخطة.' : 'الدفع السنوي لسه مش متاح. تقدر تشوف ملخص الاشتراك وترجع للألعاب؛ اختيار الخطة مش اشتراك مدفوع.'}{snapshot?.enforcement === false && ' حاليًا كل الألعاب متاحة للحسابات المكتملة أثناء التطوير.'}</p>
      <p className="platform-muted mt-4 text-center">حساب واحد. قرارات كتير. كل تجربة بتعلّمك حاجة جديدة.</p>
    </main>
  </div></div>;
}
