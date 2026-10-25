import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Trophy, LogOut, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import mark from "@/assets/brand/the-analyst-mark.png";
import { cairoDateTime } from "@/lib/analytics/export";
import { Button } from "@/components/ui/button";
import "@/styles/auth.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
const rpc = async (fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await (supabase.rpc as any)(fn, args);
  if (error) throw error;
  return data as any;
};
const egp = (minor?: number | null) => (typeof minor === "number" ? `${(minor / 100).toLocaleString("en-US")} ج.م` : "—");
const dt = (v?: string | null) => (v ? cairoDateTime(v) : "—");
const ORDER_STATUS: Record<string, string> = { pending: "معلّق", paid: "مدفوع", failed: "فاشل", refunded: "مسترد", voided: "ملغى", review: "قيد المراجعة" };
const orderStatus = (s?: string | null) => (s ? (ORDER_STATUS[s] ?? s) : "—");
const remainingDays = (expires?: string | null) => {
  if (!expires) return "—";
  const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
  return days > 0 ? `${days} يوم` : "انتهى";
};

const Card = ({ title, value, note }: { title: string; value: React.ReactNode; note?: string }) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <div className="text-sm text-muted-foreground">{title}</div>
    <div className="mt-1 text-2xl font-bold text-foreground" dir="ltr" style={{ textAlign: "right" }}>{value}</div>
    {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
  </div>
);
const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="border-t border-border py-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-foreground">{title}</h2>{action}</div>
    {children}
  </section>
);
const State = ({ q, empty, children }: { q: { isLoading: boolean; error: unknown }; empty?: boolean; children: React.ReactNode }) => {
  if (q.isLoading) return <p className="py-8 text-center text-muted-foreground">جاري التحميل...</p>;
  if (q.error) return <p className="py-8 text-center text-destructive">تعذّر تحميل البيانات. جرّب التحديث.</p>;
  if (empty) return <p className="py-8 text-center text-muted-foreground">لا توجد بيانات مطابقة.</p>;
  return <>{children}</>;
};

const STATUS_FILTERS = ["", "pending", "paid", "failed", "refunded", "review"] as const;

export default function AdminPayments() {
  const { session, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const ok = !!session && isAdmin;
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => { if (!authLoading && !ok) navigate("/admin/login", { replace: true }); }, [authLoading, ok, navigate]);
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 350); return () => clearTimeout(t); }, [search]);

  const opts = { enabled: ok, refetchOnWindowFocus: false } as const;
  const overview = useQuery({ ...opts, queryKey: ["adm-pay-overview"], queryFn: () => rpc("admin_payments_overview") });
  const orders = useQuery({ ...opts, queryKey: ["adm-pay-orders", status, debounced], queryFn: () => rpc("admin_payment_orders", { _status: status || null, _search: debounced || null, _limit: 100 }) });
  const subs = useQuery({ ...opts, queryKey: ["adm-pay-subs"], queryFn: () => rpc("admin_entitlements", { _limit: 200 }) });

  const o = overview.data ?? {};
  const orderRows: any[] = orders.data?.rows ?? [];
  const subRows: any[] = subs.data?.rows ?? [];

  return (
    <div className="auth-theme min-h-screen bg-background text-foreground" dir="rtl">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3"><img src={mark} alt="The Analyst" className="h-9 w-9 object-contain" /><div><h1 className="font-bold">المدفوعات والاشتراكات</h1><p className="text-xs text-muted-foreground">خاصة بالإدارة</p></div></div>
          <div className="flex items-center gap-2">
            <Link to="/admin/stats" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"><BarChart3 className="h-4 w-4" />الإحصائيات</Link>
            <Link to="/admin/board-9k2x" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"><Trophy className="h-4 w-4" />لوحة الفائزين</Link>
            <Button onClick={() => { overview.refetch(); orders.refetch(); subs.refetch(); }}><RefreshCw className="h-4 w-4" />تحديث</Button>
            <Button onClick={async () => { await signOut(); navigate("/admin/login"); }}><LogOut className="h-4 w-4" />خروج</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">
        <State q={overview}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="مدفوعات مؤكدة" value={o.paid_count ?? "—"} />
            <Card title="إجمالي محصّل" value={typeof o.collected_minor === "number" ? egp(o.collected_minor) : "—"} note="مدفوعات مؤكدة فقط" />
            <Card title="مدفوعات معلّقة" value={o.pending_count ?? "—"} />
            <Card title="مدفوعات فاشلة" value={o.failed_count ?? "—"} />
            <Card title="مسترد / ملغى" value={o.refunded_count ?? "—"} />
            <Card title="اشتراكات نشطة" value={o.active_subscriptions ?? "—"} />
            <Card title="اشتراكات منتهية" value={o.expired_subscriptions ?? "—"} />
            <Card title="اشتراكات ملغاة" value={o.revoked_subscriptions ?? "—"} />
          </div>
        </State>

        <Section title="سجل المدفوعات" action={
          <div className="flex flex-wrap items-center gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف أو المرجع" className="min-h-9 rounded-md border border-border bg-background px-3 text-sm" />
            <div className="flex gap-1">
              {STATUS_FILTERS.map((s) => (
                <button key={s || "all"} onClick={() => setStatus(s)} className={`min-h-9 rounded-md border px-3 text-sm ${status === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>{s ? orderStatus(s) : "الكل"}</button>
              ))}
            </div>
          </div>
        }>
          <State q={orders} empty={!orderRows.length}>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-muted/50 text-muted-foreground"><tr>
                  <th className="p-2 text-right font-medium">المستخدم</th><th className="p-2 text-right font-medium">المرجع</th><th className="p-2 text-right font-medium">المبلغ</th><th className="p-2 text-right font-medium">الحالة</th><th className="p-2 text-right font-medium">البيئة</th><th className="p-2 text-right font-medium">تاريخ الإنشاء</th><th className="p-2 text-right font-medium">تاريخ الدفع</th><th className="p-2 text-right font-medium">مرجع المزود</th><th className="p-2 text-right font-medium">الاشتراك</th>
                </tr></thead>
                <tbody>
                  {orderRows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-2">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}<div className="text-xs text-muted-foreground" dir="ltr">{r.phone ?? ""}</div></td>
                      <td className="p-2 font-mono text-xs" dir="ltr">{String(r.id).slice(0, 8)}</td>
                      <td className="p-2" dir="ltr">{egp(r.amount_minor)}</td>
                      <td className="p-2">{orderStatus(r.status)}</td>
                      <td className="p-2" dir="ltr">{r.environment}</td>
                      <td className="p-2 text-xs">{dt(r.created_at)}</td>
                      <td className="p-2 text-xs">{dt(r.paid_at)}</td>
                      <td className="p-2 font-mono text-xs" dir="ltr">{r.transaction_id ?? r.provider_order_id ?? "—"}</td>
                      <td className="p-2">{r.transaction_id == null ? "—" : r.subscription_active ? "نشط" : "غير نشط"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </State>
        </Section>

        <Section title="الاشتراكات السنوية">
          <State q={subs} empty={!subRows.length}>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 text-muted-foreground"><tr>
                  <th className="p-2 text-right font-medium">المشترك</th><th className="p-2 text-right font-medium">البداية</th><th className="p-2 text-right font-medium">الانتهاء</th><th className="p-2 text-right font-medium">المتبقي</th><th className="p-2 text-right font-medium">الحالة</th><th className="p-2 text-right font-medium">البيئة</th>
                </tr></thead>
                <tbody>
                  {subRows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-2">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}<div className="text-xs text-muted-foreground" dir="ltr">{r.phone ?? ""}</div></td>
                      <td className="p-2 text-xs">{dt(r.starts_at)}</td>
                      <td className="p-2 text-xs">{dt(r.expires_at)}</td>
                      <td className="p-2">{r.revoked_at ? "—" : remainingDays(r.expires_at)}</td>
                      <td className="p-2">{r.revoked_at ? `ملغى (${r.revocation_reason ?? ""})` : new Date(r.expires_at) > new Date() ? "نشط" : "منتهٍ"}</td>
                      <td className="p-2" dir="ltr">{r.environment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </State>
        </Section>

        <Section title="تشخيص الإشعارات والمطابقة">
          <State q={overview}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card title="إشعارات مستلمة ومقبولة" value={o.webhook_events ?? "—"} note="التكرارات تُرفض بأمان ولا تُنشئ اشتراكًا مضاعفًا" />
              <Card title="محاولات عالقة" value={o.stuck_attempts ?? "—"} note="محاولات بلا حالة نهائية منذ أكثر من ساعة" />
              <Card title="مدفوعات بانتظار التأكيد" value={o.pending_count ?? "—"} note="يمكن حسمها عبر المطابقة عند توفر بيانات الاعتماد" />
            </div>
          </State>
        </Section>
      </main>
    </div>
  );
}
