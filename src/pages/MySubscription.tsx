import SubscriptionLayout from "@/features/subscription/SubscriptionLayout";
import SubscriptionDetails from "@/features/subscription/SubscriptionDetails";
import { useSubscription } from "@/features/subscription/useSubscription";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function MySubscription() {
  const { data, error, loading, enabled, refresh } = useSubscription();
  return <SubscriptionLayout>
    <p className="text-sm font-bold text-[#A61E25]">الحساب</p>
    <h1 className="mt-2 text-3xl font-bold sm:text-4xl">اشتراكي</h1>
    <p className="mb-7 mt-3 leading-7 text-muted-foreground">مساحتك لمعرفة تفاصيل تجربتك.</p>
    {loading ? <p role="status">جاري التحقق من الاشتراك...</p> : <SubscriptionDetails snapshot={data?.snapshot ?? null} verificationError={error} />}
    {enabled && <Button onClick={() => void refresh()} disabled={loading} className="mt-5"><RefreshCw className="h-4 w-4" />تحديث الاشتراك</Button>}
  </SubscriptionLayout>;
}
