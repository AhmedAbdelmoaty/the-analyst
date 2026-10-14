import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SubscriptionLayout from "@/features/subscription/SubscriptionLayout";
import { routeForPlanChoice, type PlanIntent } from "@/features/subscription/planIntent";
import AnnualPrice from "@/features/subscription/AnnualPrice";
import currentGame from "@/assets/scenes/mansour-office-welcome-male.webp";
import rewardCover from "@/features/reward-decision/assets/rd-cover-l.webp.asset.json";

export default function PlanChoice() {
  const navigate = useNavigate();
  const { user, loading, isProfileComplete } = useAuth();

  const choose = (intent: PlanIntent) => {
    if (loading) return;
    navigate(routeForPlanChoice(intent, !!user, isProfileComplete));
  };

  return <SubscriptionLayout publicPage wide>
    <p className="text-sm font-bold text-[#A61E25]">تجارب The Analyst</p>
    <h1 className="mt-2 text-3xl font-bold leading-snug sm:text-4xl">اختار تجربتك</h1>
    <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">حساب واحد يفتح لك اللعب والتعلّم بالطريقة التي تناسبك.</p>
    <div className="mt-7 grid items-stretch gap-5 md:grid-cols-2">
      <section className="flex min-w-0 flex-col rounded-lg border border-border bg-white p-5 sm:p-6">
        <p className="text-sm font-bold text-[#A61E25]">الخطة المجانية</p>
        <h2 className="mt-2 text-2xl font-bold">ابدأ مجانًا</h2>
        <p className="mt-3 leading-7 text-muted-foreground">جرّب التفكير التحليلي في تجربة قصصية تفاعلية، واتخذ قراراتك بنفسك.</p>
        <ul className="mt-5 flex-1 list-disc space-y-2 pr-5 text-sm leading-7 marker:text-[#A61E25]">
          <li>الوصول إلى لعبة «اسأل صح».</li>
          <li>بدون دفع.</li>
        </ul>
        <button type="button" disabled={loading} onClick={() => choose("free")} className="mt-6 min-h-12 rounded-md border border-[#A61E25] px-5 font-bold text-[#A61E25] transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A61E25] disabled:cursor-wait disabled:opacity-60">ابدأ مجانًا</button>
      </section>
      <section className="flex min-w-0 flex-col rounded-lg border border-[#A61E25]/50 bg-white p-5 sm:p-6">
        <p className="text-sm font-bold text-[#A61E25]">الخطة السنوية</p>
        <h2 className="mt-2 text-2xl font-bold">التجربة الكاملة</h2>
        <div className="mt-3"><AnnualPrice /></div>
        <p className="mt-3 leading-7 text-muted-foreground">خُض مواقف وتحديات مختلفة تختبر طريقة تفكيرك وقراراتك.</p>
        <ul className="mt-5 flex-1 list-disc space-y-2 pr-5 text-sm leading-7 marker:text-[#A61E25]">
          <li>الوصول إلى جميع الألعاب المتاحة على المنصة.</li>
          <li>مدة الوصول سنة من تأكيد الدفع.</li>
        </ul>
        <button type="button" disabled={loading} onClick={() => choose("annual")} className="mt-6 min-h-12 rounded-md bg-[#A61E25] px-5 font-bold text-white transition hover:bg-[#86181e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A61E25] disabled:cursor-wait disabled:opacity-60">اشترك الآن</button>
      </section>
    </div>
    {loading && <p role="status" className="mt-4 text-sm text-muted-foreground">جاري التحقق من الحساب...</p>}
    <section className="mt-10 border-t border-border pt-7" aria-labelledby="current-games">
      <h2 id="current-games" className="text-xl font-bold">الألعاب المتاحة الآن</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <article className="overflow-hidden rounded-lg border border-border bg-white">
          <img src={currentGame} alt="" className="aspect-[16/7] w-full object-cover" />
          <div className="p-4"><h3 className="font-bold">اسأل صح</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">حقّق في نتيجة مبيعات تبدو أقل من المتوقع، وافحص السؤال قبل اقتراح الحل.</p></div>
        </article>
        <article className="overflow-hidden rounded-lg border border-border bg-white">
          <img src={rewardCover.url} alt="" className="aspect-[16/7] w-full object-cover" />
          <div className="p-4"><h3 className="font-bold">قرار التكريم</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">قارن بين فريقين باستخدام بيانات العمل، ثم قدّم توصيتك.</p></div>
        </article>
      </div>
    </section>
  </SubscriptionLayout>;
}
