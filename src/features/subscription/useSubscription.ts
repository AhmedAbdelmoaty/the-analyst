import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PAYMENT_UI_ENABLED, readPaymentStatus, type PaymentStatusResponse } from "./paymentApi";

export function useSubscription(orderId?: string) {
  const { user, loading: authLoading } = useAuth();
  const generation = useRef(0);
  const [state, setState] = useState<{ owner: string | null; data: PaymentStatusResponse | null; loading: boolean; error: boolean }>({ owner: null, data: null, loading: false, error: false });
  const refresh = useCallback(async () => {
    const revision = ++generation.current;
    if (!PAYMENT_UI_ENABLED || !user || authLoading) return;
    setState({ owner: user.id, data: null, loading: true, error: false });
    try {
      const data = await readPaymentStatus(orderId);
      if (revision === generation.current) setState({ owner: user.id, data, loading: false, error: false });
    } catch {
      if (revision === generation.current) setState({ owner: user.id, data: null, loading: false, error: true });
    }
  }, [user?.id, authLoading, orderId]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);
  const current = state.owner === user?.id ? state : { data: null, loading: PAYMENT_UI_ENABLED, error: false };
  return { ...current, loading: PAYMENT_UI_ENABLED && (authLoading || current.loading), refresh, enabled: PAYMENT_UI_ENABLED };
}