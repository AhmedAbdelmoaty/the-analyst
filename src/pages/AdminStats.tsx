import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshCw, Download, Trophy, LogOut, X, ArrowUpDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import mark from "@/assets/brand/the-analyst-mark.png";
import { GAMES, gameLabel } from "@/features/admin-stats/labels";
import { presetRange, type Preset } from "@/features/admin-stats/dates";
import { cairoDateTime, downloadCsv, downloadXlsx, type Sheet } from "@/lib/analytics/export";
import { resultLabel, roundResult, completionRate } from "@/features/admin-stats/results";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS, INDUSTRIES, KNOWN_COUNTRIES } from "@/features/profile/workProfile";
import { audienceLabel, audienceRows, EMPTY_AUDIENCE_FILTERS, userReportArgs, type AudienceFilters } from "@/features/admin-stats/audience";
import "@/styles/auth.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Filters = { from: string; to: string; game: string; include: boolean };
type Tab = "overview" | "users" | "games";
const PAGE = 25;
const rpc = async (fn: string, args: Record<string, unknown>) => {
  const { data, error } = await (supabase.rpc as any)(fn, args);
  if (error) throw error;
  return data as any;
};
const base = (f: Filters) => ({ _from: f.from, _to: f.to, _include: f.include });
const n = (v: unknown) => (typeof v === "number" ? v.toLocaleString("en-US") : v == null ? "—" : String(v));
const pct = (a?: number, b?: number) => (b ? `${Math.round(((a ?? 0) / b) * 100)}%` : "—");

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
const Dist = ({ data, label }: { data: Record<string, number>; label: (k: string) => string }) => {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <p className="text-sm text-muted-foreground">لا توجد نتائج مسجلة.</p>;
  return <ul className="space-y-2">{entries.map(([k, v]) => (
    <li key={k}>
      <div className="flex justify-between text-sm"><span>{label(k)}</span><span dir="ltr">{v} ({pct(v, total)})</span></div>
      <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(v / total) * 100}%` }} /></div>
    </li>))}</ul>;
};
const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <Button {...p} />;
function AudienceCard({ kind, title, data }: { kind: "country" | "gender" | "department" | "industry"; title: string; data?: Record<string, number> }) {
  const rows = audienceRows(data);
  return <section className="rounded-lg border border-border bg-card p-4"><h3 className="mb-3 font-semibold">{title}</h3>{rows.length ? <ul className="max-h-60 space-y-2 overflow-y-auto">{rows.map(({ key, count, percent }) => <li key={key}><div className="flex justify-between gap-2 text-sm"><span className="truncate">{audienceLabel(kind, key)}</span><span className="shrink-0" dir="ltr">{n(count)} ({percent}%)</span></div><div className="mt-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-[#A61E25]" style={{ width: `${percent}%` }}/></div></li>)}</ul> : <p className="text-sm text-muted-foreground">لا توجد حسابات ضمن الاختيارات الحالية.</p>}</section>;
}
function AudienceInsights({ audience }: { audience?: { total: number; country: Record<string, number>; gender: Record<string, number>; department: Record<string, number>; industry: Record<string, number> } }) {
  return <section className="mb-5 rounded-lg border border-border bg-muted/30 p-3 md:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">ملامح الجمهور</h2><span className="text-sm text-muted-foreground">{n(audience?.total ?? 0)} حسابًا مطابقًا</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AudienceCard kind="country" title="توزيع البلدان" data={audience?.country}/><AudienceCard kind="gender" title="الشخصية المختارة" data={audience?.gender}/><AudienceCard kind="department" title="الأقسام" data={audience?.department}/><AudienceCard kind="industry" title="القطاعات" data={audience?.industry}/></div></section>;
}

export default function AdminStats() {
  const { session, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [preset, setPreset] = useState<Preset>("7");
  const [f, setF] = useState<Filters>(() => ({ ...presetRange("7"), game: "", include: false }));
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(0);
  const [userFilters, setUserFilters] = useState<AudienceFilters>(EMPTY_AUDIENCE_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const ok = !!session && isAdmin;

  useEffect(() => { if (!authLoading && !ok) navigate("/admin/login", { replace: true }); }, [authLoading, ok, navigate]);
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => setPage(0), [debounced, sort, f, userFilters]);

  const game = f.game || null, status = null;
  const opts = { enabled: ok, refetchInterval: 5 * 60 * 1000, refetchOnWindowFocus: false } as const;
  const overview = useQuery({ ...opts, queryKey: ["adm-overview", f], queryFn: () => rpc("admin_overview", { ...base(f), _game: game, _status: status }), enabled: ok && tab === "overview" });
  const users = useQuery({ ...opts, queryKey: ["adm-users", f, debounced, sort, page, userFilters], queryFn: () => rpc("admin_users", userReportArgs({ ...base(f), _game: game, _status: status }, userFilters, debounced, sort, PAGE, page * PAGE)), enabled: ok && tab === "users" });
  const activity = useQuery({ ...opts, queryKey: ["adm-activity", f], queryFn: () => rpc("admin_activity_summary", { ...base(f), _game: game }) });
  const metrics = activity.data?.games ?? [];
  const totals = (key: string) => metrics.reduce((sum: number, g: any) => sum + (g[key] ?? 0), 0);
  const mergedUser = (r: any) => {
    const row = { ...r, ...(activity.data?.users?.[r.user_id] ?? {}) };
    const tracking = activity.data?.tracking_since?.rounds_since;
    return { ...row, attempts: row.attempts === 0 && tracking && row.created_at < tracking ? null : row.attempts };
  };
  const detail = useQuery({ queryKey: ["adm-user", selected], queryFn: () => rpc("admin_user_detail", { _user_id: selected }), enabled: ok && !!selected });
  const active = tab === "overview" ? overview : tab === "users" ? users : activity;
  const updatedAt = active.dataUpdatedAt ? cairoDateTime(new Date(active.dataUpdatedAt)) : "—";

  const since = activity.data?.tracking_since;
  const trackDay = (k: string) => (since?.[k] ? String(since[k]).slice(0, 10) : null);
  const beforeTracking = (k: string) => { const d = trackDay(k); return d && f.from < d ? `بدأ التتبع ${d}؛ ما قبله غير متاح` : undefined; };

  if (authLoading || !ok) return <div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحميل...</div>;

  // ---------- Export ----------
  const filtersMeta = { from: f.from, to: f.to, game: f.game || "all", include: f.include, ...userFilters };
  const userSheet = async (): Promise<Sheet> => {
    const d = await rpc("admin_users", userReportArgs({ ...base(f), _game: game, _status: status }, userFilters, debounced, sort, 100000, 0));
    return { name: "المستخدمون", columns: [
      { key: "first_name", header: "الاسم الأول" }, { key: "last_name", header: "اسم العائلة" }, { key: "phone", header: "الهاتف", text: true }, { key: "country", header: "البلد" },
      { key: "gender", header: "الشخصية" }, { key: "department", header: "القسم" }, { key: "department_other", header: "القسم - أخرى", text: true }, { key: "industry", header: "القطاع" }, { key: "industry_other", header: "القطاع - أخرى", text: true },
      { key: "created_at", header: "تاريخ التسجيل (القاهرة)", date: true }, { key: "confirmed", header: "مؤكد" }, { key: "last_activity", header: "آخر نشاط (كل الوقت)", date: true },
      { key: "visits", header: "الزيارات (الفترة)" }, { key: "attempts", header: "المحاولات (الفترة)" }, { key: "completed", header: "المكتملة (الفترة)" }, { key: "is_test", header: "حساب اختبار" }, { key: "is_admin", header: "إدارة" },
    ], rows: (d.rows ?? []).map((row: any) => { const r = mergedUser(row); return ({ ...r, country: audienceLabel("country", r.country), gender: audienceLabel("gender", r.gender), department: audienceLabel("department", r.department), industry: audienceLabel("industry", r.industry), confirmed: r.confirmed ? "نعم" : "لا", is_test: r.is_test ? "نعم" : "لا", is_admin: r.is_admin ? "نعم" : "لا" }); }) };
  };
  const roundsSheet = async (): Promise<Sheet> => {
    const rows = await rpc("admin_export_rounds", { ...base(f), _game: game, _status: status });
    return { name: "الجولات", columns: [
      { key: "game", header: "اللعبة" }, { key: "source", header: "المصدر" }, { key: "first_name", header: "الاسم الأول" }, { key: "last_name", header: "اسم العائلة" }, { key: "phone", header: "الهاتف", text: true },
      { key: "started_at", header: "البداية", date: true }, { key: "finished_at", header: "النهاية", date: true }, { key: "result", header: "النتيجة" },
    ], rows: (rows ?? []).map((r: any) => ({ ...r, game: gameLabel(r.game), source: r.source === "legacy" ? "قديم" : "مباشر", finished_at: r.completed_at ?? r.timed_out_at, result: resultLabel(roundResult(r)) })) };
  };
  const gamesSheet = async (): Promise<Sheet> => {
    const d = await rpc("admin_activity_summary", { ...base(f), _game: game });
    return { name: "ملخص الألعاب", columns: [
      { key: "game", header: "اللعبة" }, { key: "players", header: "اللاعبون" }, { key: "attempts", header: "المحاولات المسجلة" }, { key: "completed", header: "المكتملة" }, { key: "legacy", header: "محاولات قديمة" },
      { key: "rate", header: "نسبة الإكمال منذ التتبع" }, { key: "wins", header: "كسب" }, { key: "losses", header: "خسر" },
    ], rows: (d.games ?? []).map((g: any) => ({ ...g, game: gameLabel(g.game), rate: completionRate(g.tracked_finished, g.tracked_starts) })) };
  };
  const summarySheet = async (): Promise<Sheet> => {
    const o = await rpc("admin_overview", { ...base(f), _game: game, _status: status });
    const rows = [
      ["الفترة", `${f.from} → ${f.to} (توقيت القاهرة)`], ["اللعبة", f.game ? gameLabel(f.game) : "كل الألعاب"], 
      ["يشمل حسابات الاختبار والإدارة", f.include ? "نعم" : "لا"], ["إجمالي الحسابات (كل الوقت)", o.accounts_total], ["مؤكدة", o.accounts_confirmed], ["غير مؤكدة", o.accounts_unconfirmed],
      ["حسابات جديدة", o.accounts_new], ["مستخدمون نشطون", o.active_users], ["زيارات", o.visits], ["المحاولات المسجلة", totals("attempts")], ["جولات اكتملت", totals("completed")],
    ];
    return { name: "الملخص", columns: [{ key: "k", header: "المؤشر" }, { key: "v", header: "القيمة" }], rows: rows.map(([k, v]) => ({ k: k as string, v: v as any })) };
  };
  const doExport = async (kind: "users" | "rounds" | "games" | "full", format: "csv" | "xlsx") => {
    setExporting(true);
    try {
      const stamp = `${f.from}_${f.to}`;
      let sheets: Sheet[];
      if (kind === "full") sheets = await Promise.all([summarySheet(), userSheet(), roundsSheet(), gamesSheet()]);
      else sheets = [await (kind === "users" ? userSheet() : kind === "rounds" ? roundsSheet() : gamesSheet())];
      if (format === "csv") downloadCsv(sheets[0], `the-analyst-${kind}-${stamp}.csv`);
      else await downloadXlsx(sheets, `the-analyst-${kind}-${stamp}.xlsx`);
      await rpc("admin_log_export", { _kind: kind, _format: format, _filters: filtersMeta, _rows: sheets.reduce((s, x) => s + x.rows.length, 0) });
    } catch { alert("تعذّر التصدير. حاول مرة أخرى."); } finally { setExporting(false); }
  };
  const ExportBtns = ({ kind }: { kind: "users" | "rounds" | "games" }) => (
    <div className="flex gap-2"><Btn disabled={exporting} onClick={() => doExport(kind, "csv")}><Download className="h-4 w-4" />CSV</Btn><Btn disabled={exporting} onClick={() => doExport(kind, "xlsx")}><Download className="h-4 w-4" />Excel</Btn></div>
  );

  const setPresetRange = (p: Preset) => { setPreset(p); if (p !== "custom") setF(x => ({ ...x, ...presetRange(p) })); };
  const toggleSort = (key: string) => setSort(s => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const o = overview.data;

  return (
    <div className="auth-theme min-h-[100dvh] bg-background text-foreground" dir="rtl">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3"><img src={mark} alt="The Analyst" className="h-9 w-9 object-contain" /><div><h1 className="font-bold">لوحة الإحصائيات</h1><p className="text-xs text-muted-foreground">خاصة بالإدارة</p></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/board-9k2x" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"><Trophy className="h-4 w-4" />لوحة الفائزين</Link>
            <Btn onClick={() => doExport("full", "xlsx")} disabled={exporting}><Download className="h-4 w-4" />التقرير الكامل Excel</Btn>
            <Btn onClick={async () => { await signOut(); navigate("/admin/login"); }}><LogOut className="h-4 w-4" />خروج</Btn>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap gap-1">{([["today", "اليوم"], ["7", "آخر 7 أيام"], ["30", "آخر 30 يومًا"], ["custom", "فترة مخصصة"]] as const).map(([k, l]) => (
            <Button key={k} onClick={() => setPresetRange(k)} aria-pressed={preset === k} className={`rounded-md border px-3 py-1.5 text-sm ${preset === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>{l}</Button>))}</div>
          {preset === "custom" && <div className="flex items-center gap-2 text-sm" dir="ltr">
            <input type="date" value={f.from} max={f.to} onChange={e => e.target.value && setF(x => ({ ...x, from: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1" aria-label="من" />
            <span>→</span>
            <input type="date" value={f.to} min={f.from} onChange={e => e.target.value && setF(x => ({ ...x, to: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1" aria-label="إلى" />
          </div>}
          <select value={f.game} onChange={e => setF(x => ({ ...x, game: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1.5 text-sm" aria-label="اللعبة">
            <option value="">كل الألعاب</option>{GAMES.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.include} onChange={e => setF(x => ({ ...x, include: e.target.checked }))} />إظهار حسابات الاختبار والإدارة</label>
          <div className="ms-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>آخر تحديث: <span dir="ltr">{updatedAt}</span></span>
            <Btn onClick={() => qc.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith("adm-") })}><RefreshCw className="h-4 w-4" />تحديث</Btn>
          </div>
        </div>

        <nav className="flex gap-1 border-b border-border" role="tablist">
          {([["overview", "نظرة عامة"], ["users", "المستخدمون"], ["games", "الألعاب"]] as const).map(([k, l]) => (
            <Button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</Button>))}
        </nav>

        {tab === "overview" && <State q={{ isLoading: overview.isLoading || activity.isLoading, error: overview.error || activity.error }}>{o && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Card title="إجمالي الحسابات" value={n(o.accounts_total)} note={`مؤكد ${o.accounts_confirmed} · غير مؤكد ${o.accounts_unconfirmed}`} />
            <Card title="حسابات جديدة" value={n(o.accounts_new)} />
            {f.game ? <Card title="لاعبو هذه اللعبة" value={n(metrics[0]?.players)} />
              : <Card title="المستخدمون النشطون" value={n(o.active_users)} />}
            <Card title="الزيارات" value={n(o.visits)} note={`منها بحساب مسجل ${o.visits_signed_in}`} />
            <Card title="الجولات التي بدأت" value={n(totals("attempts"))} />
            <Card title="جولات اكتملت" value={n(totals("completed"))} />
          </div>
          <Section title="النشاط اليومي">
            <div className="h-64" dir="ltr"><ResponsiveContainer><BarChart data={(o.daily ?? []).filter((d: any) => d.visits || d.starts || d.completions)} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="day" fontSize={11} tickFormatter={v => v.slice(5)} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend />
              <Bar dataKey="visits" name="زيارات" fill="hsl(var(--muted-foreground))" radius={[4,4,0,0]} />
              <Bar dataKey="starts" name="بدايات" fill="hsl(var(--foreground))" radius={[4,4,0,0]} />
              <Bar dataKey="completions" name="إكمالات" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            </BarChart></ResponsiveContainer></div>
          </Section>
          <Section title="مقارنة الألعاب">
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-muted-foreground">{["اللعبة","لاعبون معروفون","محاولات مسجلة","مكتملة","كسب","خسر"].map(k => <th key={k} className="p-3 text-right">{k}</th>)}</tr></thead><tbody>{metrics.map((g: any) => <tr key={g.game} className="border-b border-border"><td className="p-3 font-semibold">{gameLabel(g.game)}</td>{[g.players,g.attempts,g.completed,g.wins,g.losses].map((v,i) => <td key={i} className="p-3">{n(v)}</td>)}</tr>)}</tbody></table></div>
          </Section>
        </div>}</State>}

        {tab === "users" && <Section title="المستخدمون" action={<ExportBtns kind="users" />}>
          {users.data?.audience && <AudienceInsights audience={users.data.audience}/>}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف" aria-label="بحث بالاسم أو الهاتف" className="w-full max-w-xs rounded-md border border-border bg-input px-3 py-1.5 text-sm" />
            <select aria-label="البلد" value={userFilters.country} onChange={e => setUserFilters(x => ({ ...x, country: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1.5 text-sm"><option value="">كل البلدان</option><option value="unknown">غير معروف / غير مقدّم</option><option value="ambiguous">رمز مشترك غير محسوم</option>{KNOWN_COUNTRIES.map(code => <option key={code} value={code}>{audienceLabel("country", code)}</option>)}</select>
            <select aria-label="الشخصية المختارة" value={userFilters.gender} onChange={e => setUserFilters(x => ({ ...x, gender: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1.5 text-sm"><option value="">كل الشخصيات</option><option value="male">ذكر</option><option value="female">أنثى</option><option value="unknown">غير معروف</option></select>
            <select aria-label="القسم" value={userFilters.department} onChange={e => setUserFilters(x => ({ ...x, department: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1.5 text-sm"><option value="">كل الأقسام</option><option value="unknown">غير مقدّم</option>{DEPARTMENTS.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>
            <select aria-label="القطاع" value={userFilters.industry} onChange={e => setUserFilters(x => ({ ...x, industry: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1.5 text-sm"><option value="">كل القطاعات</option><option value="unknown">غير مقدّم</option>{INDUSTRIES.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>
            {(userFilters.country || userFilters.gender || userFilters.department || userFilters.industry) && <Btn onClick={() => setUserFilters({ ...EMPTY_AUDIENCE_FILTERS })}>مسح فلاتر الجمهور</Btn>}
          </div>
          <State q={{ isLoading: users.isLoading || activity.isLoading, error: users.error || activity.error }} empty={users.data && !users.data.rows?.length}>
            <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm">
              <thead><tr className="border-b border-border text-muted-foreground">{([["name", "الاسم"], [null, "الهاتف"], [null, "البلد"], [null, "القسم"], [null, "القطاع"], ["last_activity", "آخر نشاط"], ["attempts", "المحاولات"], ["completed", "الجولات المكتملة"], ["visits", "الزيارات"], ["created_at", "التسجيل"]] as const).map(([k, l]) => (
                <th key={l} className="px-2 py-2 text-right font-semibold">{k ? <Button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1">{l}<ArrowUpDown className="h-3 w-3" /></Button> : l}</th>))}</tr></thead>
              <tbody>{(users.data?.rows ?? []).map(mergedUser).map((r: any) => (
                <tr key={r.user_id} onClick={() => setSelected(r.user_id)} className="cursor-pointer border-b border-border/60 hover:bg-muted">
                  <td className="px-2 py-2">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}{r.is_test && <span className="ms-2 rounded bg-muted px-1 text-xs">اختبار</span>}{r.is_admin && <span className="ms-2 rounded bg-muted px-1 text-xs">إدارة</span>}</td>
                  <td className="px-2 py-2" dir="ltr" style={{ textAlign: "right" }}>{r.phone ?? "—"}</td>
                  <td className="px-2 py-2">{audienceLabel("country", r.country)}</td>
                  <td className="px-2 py-2">{audienceLabel("department", r.department)}{r.department === "other" && r.department_other ? `: ${r.department_other}` : ""}</td>
                  <td className="px-2 py-2">{audienceLabel("industry", r.industry)}{r.industry === "other" && r.industry_other ? `: ${r.industry_other}` : ""}</td>
                  <td className="px-2 py-2" dir="ltr" style={{ textAlign: "right" }}>{cairoDateTime(r.last_activity) || "—"}</td>
                  <td className="px-2 py-2">{r.attempts == null ? "غير مسجل" : r.attempts}</td><td className="px-2 py-2">{r.completed ?? 0}</td><td className="px-2 py-2">{r.visits == null ? "غير مسجل" : r.visits}</td><td className="px-2 py-2" dir="ltr" style={{ textAlign: "right" }}>{cairoDateTime(r.created_at)}</td>
                </tr>))}</tbody>
            </table></div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{users.data?.total ?? 0} مستخدم</span>
              <div className="flex gap-2"><Btn disabled={page === 0} onClick={() => setPage(p => p - 1)}>السابق</Btn><Btn disabled={(page + 1) * PAGE >= (users.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>التالي</Btn></div>
            </div>
          </State>
        </Section>}

        {tab === "games" && <State q={activity}>
          <div className="flex justify-end"><ExportBtns kind="rounds" /></div>
          <div className="mt-3 space-y-6">{metrics.map((g: any) => (
            <Section key={g.game} title={gameLabel(g.game)} action={<ExportBtns kind="games" />}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Card title="لاعبون معروفون" value={n(g.players)} /><Card title="محاولات مسجلة" value={n(g.attempts)} note={`${g.tracked_starts} بداية مسجلة منذ التتبع${g.legacy ? ` · ${g.legacy} قديمة مكتملة` : ""}`} />
                <Card title="مكتملة" value={n(g.completed)} /><Card title="نسبة الإكمال" value={completionRate(g.tracked_finished, g.tracked_starts)} note="الجولات معروفة البداية فقط؛ تشمل انتهاء الوقت" />
              </div>
              <div className="mt-5"><h3 className="mb-3 font-semibold">نتيجة اللعبة</h3><Dist data={{ win: g.wins, loss: g.losses }} label={resultLabel} /></div>
              {g.unknown > 0 && <p className="mt-2 text-xs text-muted-foreground">{g.unknown} نتيجة غير مسجلة</p>}
            </Section>))}</div>
        </State>}
      </main>

      {selected && <UserDetail data={detail.data} q={detail} onClose={() => setSelected(null)} onFlag={async (v) => { await rpc("admin_set_test_flag", { _user_id: selected, _is_test: v }); qc.invalidateQueries(); }} />}
    </div>
  );
}

function UserDetail({ data, q, onClose, onFlag }: { data: any; q: { isLoading: boolean; error: unknown }; onClose: () => void; onFlag: (v: boolean) => void }) {
  const byGame = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const r of data?.rounds ?? []) (m[r.game] ??= []).push(r);
    return m;
  }, [data]);
  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-foreground/30" onClick={onClose}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-card p-4 shadow-xl" onClick={e => e.stopPropagation()} role="dialog" aria-label="تفاصيل المستخدم">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">تفاصيل اللاعب</h2><Button onClick={onClose} aria-label="إغلاق"><X className="h-5 w-5" /></Button></div>
        <State q={q} empty={!data}>{data && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>الاسم: <b>{[data.first_name, data.last_name].filter(Boolean).join(" ") || "—"}</b></div>
            <div>الهاتف: <b dir="ltr">{data.phone ?? "—"}</b></div>
            <div>البلد: <b>{audienceLabel("country", data.country)}</b></div>
            <div>الشخصية المختارة: <b>{audienceLabel("gender", data.gender_choice ?? "unknown")}</b></div>
            <div>القسم: <b>{audienceLabel("department", data.department ?? "unknown")}{data.department_other ? `: ${data.department_other}` : ""}</b></div>
            <div>القطاع: <b>{audienceLabel("industry", data.industry ?? "unknown")}{data.industry_other ? `: ${data.industry_other}` : ""}</b></div>
            <div>التسجيل: <span dir="ltr">{cairoDateTime(data.created_at)}</span></div>
            <div>الحالة: {data.confirmed ? "مؤكد" : "غير مؤكد"}</div>
            <div>الزيارات المسجلة: {data.visits_total || "لا توجد زيارات مسجلة منذ بدء التتبع"}</div>
            <div>آخر زيارة: <span dir="ltr">{cairoDateTime(data.last_visit) || "—"}</span></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!data.is_test} onChange={e => onFlag(e.target.checked)} />حساب اختبار (يُستبعد من الإحصائيات افتراضيًا)</label>
          {Object.keys(byGame).length === 0 && <p className="text-sm text-muted-foreground">لا توجد محاولات مسجلة.</p>}
          {Object.entries(byGame).map(([g, rounds]) => {
            const done = rounds.filter(r => r.completed_at || r.timed_out_at);
            return <div key={g} className="border-t border-border pt-3">
              <h3 className="font-semibold">{gameLabel(g)}</h3>
              <p className="text-sm text-muted-foreground">محاولات مسجلة: {rounds.length} · مكتملة: {done.length}</p>
              <div className="mt-2 overflow-x-auto"><table className="w-full text-xs">
                <thead><tr className="border-b border-border text-muted-foreground"><th className="p-2 text-right">البداية</th><th className="p-2 text-right">النهاية</th><th className="p-2 text-right">النتيجة</th></tr></thead>
                <tbody>{rounds.map(r => <tr key={r.round_id} className="border-b border-border/60">
                  <td className="p-2">{r.started_at ? cairoDateTime(r.started_at) : r.source === "legacy" ? "قديمة؛ البداية غير متاحة" : "غير مسجلة"}</td>
                  <td className="p-2">{cairoDateTime(r.completed_at ?? r.timed_out_at) || "—"}</td><td className="p-2">{resultLabel(roundResult(r))}</td>
                </tr>)}</tbody>
              </table></div>
            </div>;
          })}
        </div>}</State>
      </aside>
    </div>
  );
}
