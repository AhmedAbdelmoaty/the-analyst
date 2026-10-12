import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshCw, Download, Trophy, LogOut, X, ArrowUpDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import mark from "@/assets/brand/the-analyst-mark.png";
import { GAMES, STATUS_OPTIONS, gameLabel, outcomeLabel, stageLabel, roundStatus, fmtMs, OUTCOME_RANK, REASON_LABEL, TOOL_LABEL, TEAM_LABEL } from "@/features/admin-stats/labels";
import { presetRange, type Preset } from "@/features/admin-stats/dates";
import { cairoDateTime, downloadCsv, downloadXlsx, type Sheet } from "@/lib/analytics/export";
import "@/styles/auth.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Filters = { from: string; to: string; game: string; status: string; include: boolean };
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
  <section className="rounded-lg border border-border bg-card p-4">
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
  if (!entries.length) return <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>;
  return <ul className="space-y-2">{entries.map(([k, v]) => (
    <li key={k}>
      <div className="flex justify-between text-sm"><span>{label(k)}</span><span dir="ltr">{v} ({pct(v, total)})</span></div>
      <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(v / total) * 100}%` }} /></div>
    </li>))}</ul>;
};
const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className={`inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50 ${p.className ?? ""}`} />;

export default function AdminStats() {
  const { session, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [preset, setPreset] = useState<Preset>("7");
  const [f, setF] = useState<Filters>(() => ({ ...presetRange("7"), game: "", status: "", include: false }));
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const ok = !!session && isAdmin;

  useEffect(() => { if (!authLoading && !ok) navigate("/admin/login", { replace: true }); }, [authLoading, ok, navigate]);
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => setPage(0), [debounced, sort, f]);

  const game = f.game || null, status = f.status || null;
  const opts = { enabled: ok, refetchInterval: 5 * 60 * 1000, refetchOnWindowFocus: false } as const;
  const overview = useQuery({ ...opts, queryKey: ["adm-overview", f], queryFn: () => rpc("admin_overview", { ...base(f), _game: game, _status: status }), enabled: ok && tab === "overview" });
  const users = useQuery({ ...opts, queryKey: ["adm-users", f, debounced, sort, page], queryFn: () => rpc("admin_users", { ...base(f), _game: game, _status: status, _search: debounced || null, _sort: sort.key, _dir: sort.dir, _limit: PAGE, _offset: page * PAGE }), enabled: ok && tab === "users" });
  const games = useQuery({ ...opts, queryKey: ["adm-games", f], queryFn: () => rpc("admin_games", { ...base(f), _status: status }), enabled: ok && tab === "games" });
  const detail = useQuery({ queryKey: ["adm-user", selected], queryFn: () => rpc("admin_user_detail", { _user_id: selected }), enabled: ok && !!selected });
  const active = tab === "overview" ? overview : tab === "users" ? users : games;
  const updatedAt = active.dataUpdatedAt ? cairoDateTime(new Date(active.dataUpdatedAt)) : "—";

  const since = overview.data?.tracking_since ?? games.data?.tracking_since;
  const trackDay = (k: string) => (since?.[k] ? String(since[k]).slice(0, 10) : null);
  const beforeTracking = (k: string) => { const d = trackDay(k); return d && f.from < d ? `بدأ التتبع ${d}؛ ما قبله غير متاح` : undefined; };

  if (authLoading || !ok) return <div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحميل...</div>;

  // ---------- Export ----------
  const filtersMeta = { from: f.from, to: f.to, game: f.game || "all", status: f.status || "all", include: f.include };
  const userSheet = async (): Promise<Sheet> => {
    const d = await rpc("admin_users", { ...base(f), _game: game, _status: status, _search: debounced || null, _sort: sort.key, _dir: sort.dir, _limit: 100000, _offset: 0 });
    return { name: "المستخدمون", columns: [
      { key: "first_name", header: "الاسم الأول" }, { key: "last_name", header: "اسم العائلة" }, { key: "phone", header: "الهاتف", text: true },
      { key: "created_at", header: "تاريخ التسجيل (القاهرة)", date: true }, { key: "confirmed", header: "مؤكد" }, { key: "last_activity", header: "آخر نشاط (كل الوقت)", date: true },
      { key: "visits", header: "الزيارات (الفترة)" }, { key: "attempts", header: "المحاولات (الفترة)" }, { key: "completed", header: "المكتملة (الفترة)" }, { key: "is_test", header: "حساب اختبار" }, { key: "is_admin", header: "إدارة" },
    ], rows: (d.rows ?? []).map((r: any) => ({ ...r, confirmed: r.confirmed ? "نعم" : "لا", is_test: r.is_test ? "نعم" : "لا", is_admin: r.is_admin ? "نعم" : "لا" })) };
  };
  const roundsSheet = async (): Promise<Sheet> => {
    const rows = await rpc("admin_export_rounds", { ...base(f), _game: game, _status: status });
    return { name: "الجولات", columns: [
      { key: "game", header: "اللعبة" }, { key: "source", header: "المصدر" }, { key: "first_name", header: "الاسم الأول" }, { key: "last_name", header: "اسم العائلة" }, { key: "phone", header: "الهاتف", text: true },
      { key: "started_at", header: "البداية", date: true }, { key: "submitted_at", header: "تقديم التقرير", date: true }, { key: "completed_at", header: "الاكتمال", date: true }, { key: "timed_out_at", header: "انتهاء الوقت", date: true },
      { key: "status", header: "الحالة" }, { key: "last_stage", header: "آخر مرحلة" }, { key: "last_activity_at", header: "آخر نشاط", date: true }, { key: "active", header: "وقت اللعب الفعلي (د:ث)" },
      { key: "outcome", header: "النتيجة" }, { key: "server_outcome", header: "تقييم السيرفر" }, { key: "server_reason", header: "سبب التقييم" }, { key: "team", header: "الفريق المختار" }, { key: "tools", header: "الأدوات" }, { key: "content_version", header: "إصدار السيناريو" },
    ], rows: (rows ?? []).map((r: any) => ({ ...r, game: gameLabel(r.game), source: r.source === "legacy" ? "قديم" : "مباشر", status: roundStatus(r), last_stage: stageLabel(r.last_stage),
      active: r.started_at && r.active_ms != null ? fmtMs(r.active_ms) : "", outcome: r.outcome ? outcomeLabel(r.outcome) : "", server_outcome: r.server_outcome ? outcomeLabel(r.server_outcome) : "",
      server_reason: r.server_reason ? REASON_LABEL[r.server_reason] ?? r.server_reason : "", team: r.details?.teamId ? TEAM_LABEL[r.details.teamId] ?? r.details.teamId : "",
      tools: Array.isArray(r.details?.usedTools) ? r.details.usedTools.map((t: string) => TOOL_LABEL[t] ?? t).join("، ") : "" })) };
  };
  const gamesSheet = async (): Promise<Sheet> => {
    const d = await rpc("admin_games", { ...base(f), _status: status });
    return { name: "ملخص الألعاب", columns: [
      { key: "game", header: "اللعبة" }, { key: "players", header: "اللاعبون" }, { key: "attempts", header: "المحاولات" }, { key: "completed", header: "المكتملة" }, { key: "completed_legacy", header: "منها قديمة" },
      { key: "timed_out", header: "انتهى الوقت" }, { key: "rate", header: "نسبة الإكمال" }, { key: "replayers", header: "أعادوا اللعب" }, { key: "median", header: "وسيط وقت اللعب" }, { key: "avg", header: "متوسط وقت اللعب" },
    ], rows: (d ?? []).filter((g: any) => !f.game || g.game === f.game).map((g: any) => ({ ...g, game: gameLabel(g.game), rate: pct(g.started_completed, g.attempts), median: fmtMs(g.active_ms_median), avg: fmtMs(g.active_ms_avg) })) };
  };
  const summarySheet = async (): Promise<Sheet> => {
    const o = await rpc("admin_overview", { ...base(f), _game: game, _status: status });
    const rows = [
      ["الفترة", `${f.from} → ${f.to} (توقيت القاهرة)`], ["اللعبة", f.game ? gameLabel(f.game) : "كل الألعاب"], ["الحالة", STATUS_OPTIONS.find(s => s.value === f.status)?.label ?? ""],
      ["يشمل حسابات الاختبار والإدارة", f.include ? "نعم" : "لا"], ["إجمالي الحسابات (كل الوقت)", o.accounts_total], ["مؤكدة", o.accounts_confirmed], ["غير مؤكدة", o.accounts_unconfirmed],
      ["حسابات جديدة", o.accounts_new], ["مستخدمون نشطون", o.active_users], ["زيارات", o.visits], ["جولات بدأت", o.rounds_started], ["جولات اكتملت (حسب تاريخ الاكتمال)", o.rounds_completed],
      ["نسبة الإكمال", pct(o.rounds_started_completed, o.rounds_started)],
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
            <button key={k} onClick={() => setPresetRange(k)} aria-pressed={preset === k} className={`rounded-md border px-3 py-1.5 text-sm ${preset === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>{l}</button>))}</div>
          {preset === "custom" && <div className="flex items-center gap-2 text-sm" dir="ltr">
            <input type="date" value={f.from} max={f.to} onChange={e => e.target.value && setF(x => ({ ...x, from: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1" aria-label="من" />
            <span>→</span>
            <input type="date" value={f.to} min={f.from} onChange={e => e.target.value && setF(x => ({ ...x, to: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1" aria-label="إلى" />
          </div>}
          <select value={f.game} onChange={e => setF(x => ({ ...x, game: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1.5 text-sm" aria-label="اللعبة">
            <option value="">كل الألعاب</option>{GAMES.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <select value={f.status} onChange={e => setF(x => ({ ...x, status: e.target.value }))} className="rounded-md border border-border bg-input px-2 py-1.5 text-sm" aria-label="الحالة">
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.include} onChange={e => setF(x => ({ ...x, include: e.target.checked }))} />إظهار حسابات الاختبار والإدارة</label>
          <div className="ms-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>آخر تحديث: <span dir="ltr">{updatedAt}</span></span>
            <Btn onClick={() => qc.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith("adm-") })}><RefreshCw className="h-4 w-4" />تحديث</Btn>
          </div>
        </div>

        <nav className="flex gap-1 border-b border-border" role="tablist">
          {([["overview", "نظرة عامة"], ["users", "المستخدمون"], ["games", "الألعاب"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>))}
        </nav>

        {tab === "overview" && <State q={overview}>{o && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card title="إجمالي الحسابات" value={n(o.accounts_total)} note={`حتى الآن · مؤكد ${o.accounts_confirmed} · غير مؤكد ${o.accounts_unconfirmed} · لا يتأثر بفلتر اللعبة`} />
            <Card title="حسابات جديدة" value={n(o.accounts_new)} note="خلال الفترة · لا يتأثر بفلتر اللعبة" />
            {f.game ? <Card title="لاعبو هذه اللعبة" value={n(o.game_players)} note="لديهم بداية جولة أو نشاط فيها خلال الفترة" />
              : <Card title="المستخدمون النشطون" value={n(o.active_users)} note="لاعبون مختلفون لهم نشاط خلال الفترة" />}
            <Card title="الزيارات" value={n(o.visits)} note={beforeTracking("visits_since") ?? `منها بحساب مسجل ${o.visits_signed_in} · لا يتأثر بفلتر اللعبة`} />
            <Card title="جولات بدأت" value={n(o.rounds_started)} note={beforeTracking("rounds_since") ?? "حسب تاريخ البداية"} />
            <Card title="جولات اكتملت" value={n(o.rounds_completed)} note="حسب تاريخ الاكتمال (يشمل النتائج القديمة)" />
            <Card title="نسبة الإكمال" value={pct(o.rounds_started_completed, o.rounds_started)} note="من الجولات التي بدأت في الفترة؛ بعضها قد يكون قيد اللعب" />
            {o.rounds_timed_out != null && <Card title="انتهى الوقت" value={n(o.rounds_timed_out)} note="اسأل صح فقط" />}
          </div>
          <Section title="النشاط اليومي (عدد)">
            <div className="h-64" dir="ltr"><ResponsiveContainer><LineChart data={o.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="day" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend />
              <Line dataKey="new_accounts" name="حسابات جديدة" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              <Line dataKey="active_users" name="نشطون" stroke="hsl(var(--foreground))" strokeDasharray="6 3" dot />
              <Line dataKey="visits" name="زيارات" stroke="hsl(var(--muted-foreground))" dot={{ r: 3 }} />
              <Line dataKey="starts" name="بدايات" stroke="hsl(var(--primary))" strokeDasharray="2 3" dot={{ r: 2 }} />
              <Line dataKey="completions" name="إكمالات" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart></ResponsiveContainer></div>
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="مقارنة الألعاب (عدد الجولات)">
              <div className="h-56" dir="ltr"><ResponsiveContainer><BarChart data={(o.games ?? []).map((g: any) => ({ ...g, name: gameLabel(g.game) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend />
                <Bar dataKey="players" name="لاعبون" fill="hsl(var(--muted-foreground))" /><Bar dataKey="starts" name="بدايات" fill="hsl(var(--foreground))" /><Bar dataKey="completions" name="إكمالات" fill="hsl(var(--primary))" />
              </BarChart></ResponsiveContainer></div>
            </Section>
            <Section title="توزيع النتائج (الجولات المكتملة في الفترة)">
              <div className="space-y-4">{(o.games ?? []).map((g: any) => <div key={g.game}><h3 className="mb-2 text-sm font-semibold">{gameLabel(g.game)}</h3><Dist data={g.outcomes} label={outcomeLabel} /></div>)}</div>
            </Section>
          </div>
          <Section title="آخر مرحلة مسجّلة للجولات غير المكتملة">
            <p className="mb-3 text-xs text-muted-foreground">آخر ما سُجّل للجولة؛ لا يعني انسحابًا مؤكدًا، فقد يعود اللاعب ويكملها.</p>
            <div className="grid gap-4 md:grid-cols-2">{(o.games ?? []).map((g: any) => <div key={g.game}><h3 className="mb-2 text-sm font-semibold">{gameLabel(g.game)}</h3><Dist data={g.stuck_stages} label={stageLabel} /></div>)}</div>
          </Section>
        </div>}</State>}

        {tab === "users" && <Section title="المستخدمون" action={<ExportBtns kind="users" />}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف" className="w-full max-w-xs rounded-md border border-border bg-input px-3 py-1.5 text-sm" />
            <span className="text-xs text-muted-foreground">الزيارات والمحاولات والمكتملة خلال الفترة المختارة؛ آخر نشاط على كل الوقت.</span>
          </div>
          <State q={users} empty={users.data && !users.data.rows?.length}>
            <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b border-border text-muted-foreground">{([["name", "الاسم"], [null, "الهاتف"], ["created_at", "التسجيل"], [null, "التحقق"], ["last_activity", "آخر نشاط"], ["visits", "الزيارات"], ["attempts", "المحاولات"], ["completed", "المكتملة"]] as const).map(([k, l]) => (
                <th key={l} className="px-2 py-2 text-right font-semibold">{k ? <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1">{l}<ArrowUpDown className="h-3 w-3" /></button> : l}</th>))}</tr></thead>
              <tbody>{(users.data?.rows ?? []).map((r: any) => (
                <tr key={r.user_id} onClick={() => setSelected(r.user_id)} className="cursor-pointer border-b border-border/60 hover:bg-muted">
                  <td className="px-2 py-2">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}{r.is_test && <span className="ms-2 rounded bg-muted px-1 text-xs">اختبار</span>}{r.is_admin && <span className="ms-2 rounded bg-muted px-1 text-xs">إدارة</span>}</td>
                  <td className="px-2 py-2" dir="ltr" style={{ textAlign: "right" }}>{r.phone ?? "—"}</td>
                  <td className="px-2 py-2" dir="ltr" style={{ textAlign: "right" }}>{cairoDateTime(r.created_at)}</td>
                  <td className="px-2 py-2">{r.confirmed ? "مؤكد" : "غير مؤكد"}</td>
                  <td className="px-2 py-2" dir="ltr" style={{ textAlign: "right" }}>{cairoDateTime(r.last_activity) || "—"}</td>
                  <td className="px-2 py-2">{r.visits}</td><td className="px-2 py-2">{r.attempts}</td><td className="px-2 py-2">{r.completed}</td>
                </tr>))}</tbody>
            </table></div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{users.data?.total ?? 0} مستخدم</span>
              <div className="flex gap-2"><Btn disabled={page === 0} onClick={() => setPage(p => p - 1)}>السابق</Btn><Btn disabled={(page + 1) * PAGE >= (users.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>التالي</Btn></div>
            </div>
          </State>
        </Section>}

        {tab === "games" && <State q={games}>
          <div className="flex justify-end"><ExportBtns kind="rounds" /></div>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">{(games.data ?? []).filter((g: any) => !f.game || g.game === f.game).map((g: any) => (
            <Section key={g.game} title={gameLabel(g.game)} action={<ExportBtns kind="games" />}>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <Card title="لاعبون مختلفون" value={n(g.players)} /><Card title="محاولات بدأت" value={n(g.attempts)} />
                <Card title="مكتملة" value={n(g.completed)} note={g.completed_legacy ? `منها ${g.completed_legacy} نتيجة قديمة` : undefined} />
                <Card title="نسبة الإكمال" value={pct(g.started_completed, g.attempts)} />
                {g.game === "problem-framing" && <Card title="انتهى الوقت" value={n(g.timed_out)} />}
                <Card title="أعادوا اللعب" value={n(g.replayers)} />
                <Card title="وسيط وقت اللعب الفعلي" value={fmtMs(g.active_ms_median)} note={`من ${g.timed_rounds} جولة مكتملة معروفة البداية`} />
                <Card title="متوسط وقت اللعب الفعلي" value={fmtMs(g.active_ms_avg)} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div><h3 className="mb-2 text-sm font-semibold">نتيجة اللعبة</h3><Dist data={g.outcomes} label={outcomeLabel} /></div>
                <div><h3 className="mb-2 text-sm font-semibold">تقييم السيرفر</h3><Dist data={g.server_outcomes} label={outcomeLabel} /></div>
                <div><h3 className="mb-2 text-sm font-semibold">آخر مرحلة للجولات غير المكتملة</h3><Dist data={g.stuck_stages} label={stageLabel} /></div>
                <div><h3 className="mb-2 text-sm font-semibold">التحسن عبر المحاولات (نفس الإصدار)</h3>
                  {g.improvement?.players ? <ul className="space-y-1 text-sm"><li>تحسّن: {g.improvement.improved}</li><li>ثابت: {g.improvement.same}</li><li>تراجع: {g.improvement.worse}</li><li className="text-xs text-muted-foreground">من {g.improvement.players} لاعب أكملوا جولتين أو أكثر</li></ul> : <p className="text-sm text-muted-foreground">لا يوجد لاعبون أكملوا أكثر من جولة.</p>}
                </div>
                {g.game === "reward-decision" && <>
                  <div><h3 className="mb-2 text-sm font-semibold">الفريق المختار</h3><Dist data={g.extra?.teams} label={k => TEAM_LABEL[k] ?? k} /></div>
                  <div><h3 className="mb-2 text-sm font-semibold">الأدوات المستخدمة (عدد التوصيات)</h3><Dist data={g.extra?.tools} label={k => TOOL_LABEL[k] ?? k} /></div>
                  <div><h3 className="mb-2 text-sm font-semibold">أسباب التقييم</h3><Dist data={g.extra?.reasons} label={k => REASON_LABEL[k] ?? k} /></div>
                </>}
                {g.game === "problem-framing" && <div><h3 className="mb-2 text-sm font-semibold">إجابات الصياغة الصحيحة (من 2)</h3><Dist data={g.extra?.framing_correct} label={k => `${k} صحيحة`} /></div>}
              </div>
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
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">تفاصيل اللاعب</h2><button onClick={onClose} aria-label="إغلاق"><X className="h-5 w-5" /></button></div>
        <State q={q} empty={!data}>{data && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>الاسم: <b>{[data.first_name, data.last_name].filter(Boolean).join(" ") || "—"}</b></div>
            <div>الهاتف: <b dir="ltr">{data.phone ?? "—"}</b></div>
            <div>التسجيل: <span dir="ltr">{cairoDateTime(data.created_at)}</span></div>
            <div>الحالة: {data.confirmed ? "مؤكد" : "غير مؤكد"}</div>
            <div>الزيارات المسجلة: {data.visits_total}</div>
            <div>آخر زيارة: <span dir="ltr">{cairoDateTime(data.last_visit) || "—"}</span></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!data.is_test} onChange={e => onFlag(e.target.checked)} />حساب اختبار (يُستبعد من الإحصائيات افتراضيًا)</label>
          {Object.keys(byGame).length === 0 && <p className="text-sm text-muted-foreground">لا توجد محاولات مسجلة.</p>}
          {Object.entries(byGame).map(([g, rounds]) => {
            const done = rounds.filter(r => r.completed_at);
            const last = done[done.length - 1];
            const best = done.reduce<any>((b, r) => ((OUTCOME_RANK[r.outcome] ?? 0) > (OUTCOME_RANK[b?.outcome] ?? -1) ? r : b), null);
            return <div key={g} className="rounded-lg border border-border p-3">
              <h3 className="font-semibold">{gameLabel(g)}</h3>
              <p className="text-sm text-muted-foreground">محاولات: {rounds.length} · مكتملة: {done.length} · آخر نتيجة: {outcomeLabel(last?.outcome)} · أفضل نتيجة: {outcomeLabel(best?.outcome)}</p>
              <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[560px] text-xs">
                <thead><tr className="border-b border-border text-muted-foreground"><th className="p-1 text-right">البداية</th><th className="p-1 text-right">الحالة</th><th className="p-1 text-right">النتيجة</th><th className="p-1 text-right">تقييم السيرفر</th><th className="p-1 text-right">وقت اللعب</th><th className="p-1 text-right">آخر مرحلة مسجّلة</th></tr></thead>
                <tbody>{rounds.map(r => <tr key={r.round_id} className="border-b border-border/60">
                  <td className="p-1" dir="ltr" style={{ textAlign: "right" }}>{r.started_at ? cairoDateTime(r.started_at) : r.source === "legacy" ? "قديمة" : "غير معروفة"}</td>
                  <td className="p-1">{roundStatus(r)}</td><td className="p-1">{outcomeLabel(r.outcome)}</td><td className="p-1">{outcomeLabel(r.server_outcome)}</td>
                  <td className="p-1" dir="ltr" style={{ textAlign: "right" }}>{r.started_at ? fmtMs(r.active_ms) : "—"}</td>
                  <td className="p-1">{stageLabel(r.last_stage)} <span className="text-muted-foreground" dir="ltr">{cairoDateTime(r.last_activity_at)}</span></td>
                </tr>)}</tbody>
              </table></div>
            </div>;
          })}
        </div>}</State>
      </aside>
    </div>
  );
}
