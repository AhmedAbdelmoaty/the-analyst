import { Link } from "react-router-dom";
import SubscriptionLayout from "@/features/subscription/SubscriptionLayout";

export function SubscriptionSummaryContent() {
  return <>
    <p className="text-sm font-bold text-[#A61E25]">ملخص الاشتراك</p>
    <h1 className="mt-2 text-3xl font-bold sm:text-4xl">التجربة الكاملة</h1>
    <p className="mt-3 text-xl font-bold"><bdi dir="ltr">$10</bdi> مقابل سنة</p>
    <div className="mt-7 rounded-lg border border-border bg-white p-6 sm:p-7">
      <h2 className="text-lg font-bold">ماذا يشمل؟</h2>
      <ul className="mt-3 list-disc space-y-2 pr-5 leading-7 marker:text-[#A61E25]">
        <li>الوصول إلى جميع الألعاب المتاحة على المنصة.</li>
        <li>مدة الوصول سنة تبدأ بعد تأكيد الدفع.</li>
      </ul>
      <button type="button" disabled aria-describedby="payment-soon" className="mt-7 min-h-12 w-full cursor-not-allowed rounded-md bg-neutral-300 px-5 font-bold text-neutral-700 sm:w-auto">المتابعة للدفع</button>
      <p id="payment-soon" role="status" className="mt-3 text-sm font-semibold text-[#A61E25]">الاشتراك المدفوع متاح قريبًا</p>
    </div>
    <Link to="/plans" className="mt-6 inline-flex min-h-11 items-center font-bold text-[#A61E25] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A61E25]">الرجوع للخطط</Link>
  </>;
}

export default function SubscriptionSummary() {
  return <SubscriptionLayout><SubscriptionSummaryContent /></SubscriptionLayout>;
}
