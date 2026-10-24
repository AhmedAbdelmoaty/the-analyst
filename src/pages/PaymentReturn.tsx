import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SubscriptionLayout from "@/features/subscription/SubscriptionLayout";
import SubscriptionDetails from "@/features/subscription/SubscriptionDetails";
import { useSubscription } from "@/features/subscription/useSubscription";

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const candidate = params.get("order");
  const orderId = candidate && /^[0-9a-f-]{36}$/i.test(candidate) ? candidate : undefined;
  const { data, error, loading, enabled, refresh } = useSubscription(orderId);
  return <SubscriptionLayout>
    <h1 className="mb-6 text-3xl font-bold">حالة الدفع</h1>
    {!enabled ? <p role="status" className="text-muted-foreground">الدفع غير متاح حاليًا. لم يتم تفعيل أي اشتراك من هذه الصفحة.</p> : loading ? <p role="status">جاري التحقق من الدفع...</p> : <>
      <SubscriptionDetails snapshot={data?.snapshot ?? null} verificationError={error} />
      {data?.orderState === "pending" && <p className="mt-4">بانتظار تأكيد الدفع. لو دفعت بالفعل، انتظر قليلًا ثم حدّث الحالة.</p>}
      {data?.orderState === "failed" && <p className="mt-4">الدفع لم يكتمل أو تم إلغاؤه.</p>}
      {(data?.orderState === "refunded" || data?.orderState === "voided" || data?.orderState === "review") && <p className="mt-4">الدفع مسترد أو ملغي أو يحتاج مراجعة؛ لا يوجد تفعيل جديد.</p>}
      <Button disabled={loading} onClick={() => void refresh(true)} className="mt-5"><RefreshCw className="h-4 w-4" />تحديث حالة الدفع</Button>
    </>}
    <Link to="/subscription" className="mt-6 block font-bold text-primary underline">اشتراكي</Link>
  </SubscriptionLayout>;
}