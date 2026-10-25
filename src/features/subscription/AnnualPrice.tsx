import { useAuth } from "@/contexts/AuthContext";
import { annualPriceForUser, type AnnualDisplayPrice } from "./pricing";

/** The same account-based display price is shown on plans and summary. */
export function AnnualPriceDisplay({ price }: { price: AnnualDisplayPrice | null }) {
  if (!price) return <div role="status" className="flex min-h-16 items-center text-sm text-muted-foreground">جاري عرض السعر...</div>;

  return <div className="min-h-16" aria-live="polite" data-annual-price={price.amount}>
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <strong className="text-4xl font-bold leading-tight text-primary sm:text-5xl"><bdi dir="ltr">{price.amount}</bdi></strong>
      <span className="text-base font-semibold text-foreground">جنيه مصري / سنة</span>
    </div>
    {price.discounted && <p className="mt-2 text-sm text-muted-foreground">
      السعر الأساسي <del className="mx-1"><bdi dir="ltr">{price.baseAmount}</bdi> جنيه مصري</del>
      <span className="block text-primary">سعر الحساب ذي الهاتف المصري المؤكَّد</span>
    </p>}
  </div>;
}

export default function AnnualPrice() {
  const { user, loading } = useAuth();
  return <AnnualPriceDisplay price={annualPriceForUser(user, loading)} />;
}
