import { useRef, useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckoutPendingError, initiateCheckout, PAYMENT_UI_ENABLED } from "./paymentApi";

export default function CheckoutAction() {
  const navigate = useNavigate();
  const key = useRef<string | null>(null);
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const pay = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!PAYMENT_UI_ENABLED || busy.current) return;
    busy.current = true;
    setLoading(true); setError(false);
    if (!key.current) key.current = crypto.randomUUID();
    const form = new FormData(event.currentTarget);
    try {
      const url = await initiateCheckout(key.current, { email: String(form.get("email")), city: String(form.get("city")), country: String(form.get("country")), street: String(form.get("street")) });
      window.location.assign(url);
    } catch (cause) {
      if (cause instanceof CheckoutPendingError) navigate("/subscription/return?order=" + cause.orderId);
      else setError(true);
    }
    finally { busy.current = false; setLoading(false); }
  };
  return <form onSubmit={pay} className="mt-7">
    {PAYMENT_UI_ENABLED && <fieldset disabled={loading} className="mb-5 grid gap-3 sm:grid-cols-2">
      {([{ name: "email", label: "البريد الإلكتروني", type: "email" }, { name: "country", label: "كود دولة الفاتورة (مثال EG)", type: "text" }, { name: "city", label: "المدينة", type: "text" }, { name: "street", label: "العنوان", type: "text" }] as const).map(field => <label key={field.name} className="text-sm font-semibold">{field.label}<input required maxLength={200} name={field.name} type={field.type} className="mt-1 min-h-11 w-full rounded-md border border-input bg-card px-3 text-foreground" /></label>)}
    </fieldset>}
    <Button type="submit" disabled={!PAYMENT_UI_ENABLED || loading} aria-describedby="payment-status" className="min-h-12 w-full bg-primary px-5 font-bold text-primary-foreground hover:bg-primary disabled:bg-muted disabled:text-muted-foreground sm:w-auto">
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      {loading ? "جاري تجهيز الدفع..." : error ? "إعادة المحاولة" : "المتابعة للدفع"}
    </Button>
    <p id="payment-status" role="status" className="mt-3 text-sm font-semibold text-primary">{!PAYMENT_UI_ENABLED ? "الاشتراك المدفوع متاح قريبًا" : error ? "تعذر بدء الدفع. حاول مرة أخرى؛ لو دفعت بالفعل، راجع صفحة اشتراكك." : "دفع سنوي لمرة واحدة، والتجديد باختيارك."}</p>
  </form>;
}