import { Link } from "react-router-dom";
import { subscriptionDisplay, type SubscriptionSnapshot } from "./model";

/** Presentation only; snapshot must come from a future authenticated server read. */
export default function SubscriptionDetails({ snapshot }: { snapshot: SubscriptionSnapshot | null }) {
  const view = subscriptionDisplay(snapshot);
  const action = {
    unavailable: { to: "/plans", label: "استعرض الخطط" },
    free: { to: "/plans", label: "اكتشف التجربة الكاملة" },
    pending: { to: "/app", label: "العودة للألعاب" },
    active: { to: "/app", label: "العودة للألعاب" },
    failed: { to: "/plans", label: "استعرض الخطط" },
    expired: { to: "/subscription/summary", label: "عرض التجديد" },
  }[view.state];
  return <section className="rounded-lg border border-border bg-white p-6 sm:p-8" data-subscription-state={view.state}>
    <h2 className="text-2xl font-bold">{view.title}</h2>
    <p className="mt-3 leading-7 text-muted-foreground">{view.message}</p>
    {view.expires && (view.state === "active" || view.state === "expired") && <p className="mt-4 text-sm font-semibold">{view.state === "active" ? "ينتهي في" : "انتهى في"} {view.expires}</p>}
    <Link to={action.to} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-md bg-[#A61E25] px-5 font-bold text-white transition hover:bg-[#86181e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A61E25]">{action.label}</Link>
  </section>;
}
