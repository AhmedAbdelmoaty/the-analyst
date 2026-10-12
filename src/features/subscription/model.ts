/** UI data supplied by a future authenticated server endpoint, never browser storage. */
export type SubscriptionSnapshot =
  | { tier: "free" }
  | { tier: "annual"; status: "pending" | "active" | "failed" | "expired"; expiresAt: string | null };

export type SubscriptionState = "unavailable" | "free" | "pending" | "active" | "failed" | "expired";

export function subscriptionDisplay(snapshot: SubscriptionSnapshot | null): {
  state: SubscriptionState;
  title: string;
  expires: string | null;
  message: string;
} {
  if (!snapshot) return {
    state: "unavailable", title: "اكتشف خطط اللعب", expires: null,
    message: "اختر التجربة التي تناسبك وابدأ اللعب.",
  };
  if (snapshot.tier === "free") return {
    state: "free", title: "الخطة المجانية", expires: null,
    message: "العب «اسأل صح» واستكشف التفكير التحليلي.",
  };
  const title = {
    pending: "بانتظار تأكيد الدفع",
    active: "التجربة الكاملة",
    failed: "لم يكتمل الدفع",
    expired: "انتهى الاشتراك",
  }[snapshot.status];
  const message = {
    pending: "سنُظهر تفاصيل اشتراكك بعد تأكيد الدفع.",
    active: "استمتع بجميع الألعاب المتاحة.",
    failed: "لم تكتمل عملية الدفع. يمكنك العودة إلى الخطط.",
    expired: "انتهت مدة الوصول إلى التجربة الكاملة.",
  }[snapshot.status];
  let expires: string | null = null;
  if (snapshot.expiresAt) {
    const date = new Date(snapshot.expiresAt);
    if (!Number.isNaN(date.getTime())) expires = new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "long", day: "numeric" }).format(date);
  }
  return { state: snapshot.status, title, expires, message };
}
