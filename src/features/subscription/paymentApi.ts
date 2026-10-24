import { supabase } from "@/integrations/supabase/client";
import type { SubscriptionSnapshot } from "./model";

// Change only after authorized schema/functions, merchant verification and test E2E sign-off.
export const PAYMENT_UI_ENABLED = false;
export type PaymentStatusResponse = {
  snapshot: SubscriptionSnapshot | null;
  orderState: "pending" | "paid" | "failed" | "refunded" | "voided" | "review" | null;
};

export async function readPaymentStatus(orderId?: string): Promise<PaymentStatusResponse> {
  if (!PAYMENT_UI_ENABLED) throw new Error("payment_disabled");
  const { data, error } = await supabase.functions.invoke("paymob-subscription", { body: { orderId } });
  if (error || !data || !("snapshot" in data)) throw new Error("verification_unavailable");
  const snapshot = data.snapshot;
  if (snapshot && (snapshot.tier !== "annual" || !["active", "expired", "pending", "failed"].includes(snapshot.status))) throw new Error("invalid_subscription");
  if (data.orderState !== null && !["pending", "paid", "failed", "refunded", "voided", "review"].includes(data.orderState)) throw new Error("invalid_order");
  return { snapshot, orderState: data.orderState };
}

export function safeCheckoutUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid_checkout");
  const url = new URL(value);
  if (url.origin !== "https://accept.paymob.com" || url.pathname !== "/unifiedcheckout/" || url.username || url.password) throw new Error("invalid_checkout");
  return url.toString();
}

export async function initiateCheckout(requestKey: string, billing: { email: string; city: string; country: string; street: string }) {
  if (!PAYMENT_UI_ENABLED) throw new Error("payment_disabled");
  const { data, error } = await supabase.functions.invoke("paymob-checkout", { body: { requestKey, billing } });
  if (error || !data?.checkoutUrl) throw new Error("checkout_unavailable");
  return safeCheckoutUrl(data.checkoutUrl);
}