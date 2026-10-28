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
    try {
      const url = await initiateCheckout(key.current);
      window.location.assign(url);
    } catch (cause) {
      if (cause instanceof CheckoutPendingError) navigate("/subscription/return?order=" + cause.orderId);
      else { key.current = null; setError(true); }
    }
    finally { busy.current = false; setLoading(false); }
  };
  return <form onSubmit={pay} className="mt-7">
    <Button type="submit" disabled={!PAYMENT_UI_ENABLED || loading} aria-describedby="payment-status" className="min-h-12 w-full bg-primary px-5 font-bold text-primary-foreground hover:bg-primary disabled:bg-muted disabled:text-muted-foreground sm:w-auto">
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      {loading ? "جاري تجهيز الدفع..." : error ? "إعادة المحاولة" : "المتابعة للدفع"}
    </Button>
    <p id="payment-status" role="status" className="mt-3 text-sm font-semibold text-primary">{!PAYMENT_UI_ENABLED ? "الاشتراك المدفوع متاح قريبًا" : error ? "تعذر بدء الدفع. حاول مرة أخرى؛ لو دفعت بالفعل، راجع صفحة اشتراكك." : "دفع سنوي لمرة واحدة، والتجديد باختيارك."}</p>
  </form>;
}