import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { adminExport, adminReveal, adminStart, usePublicState } from "./eventApi";
import "./event.css";

type Row = { rank: number | null; full_name: string; phone: string | null; company_name: string | null; department: string | null; industry: string | null; interested: boolean | null };
const STEPS = ["", "كشف المركز الثالث", "كشف المركز الثاني", "كشف المركز الأول 🥁", "عرض المراكز 4–50"];

export default function AdminEventArena() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { state, reload } = usePublicState(4000);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    void (supabase.rpc as unknown as (f: string, a: object) => Promise<{ data: boolean }>)("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);
  if (loading || isAdmin === null) return <p className="p-8 text-center">جاري التحميل...</p>;
  if (!isAdmin) return <div className="p-8 text-center">غير مصرح. <Link className="underline" to="/admin/login">دخول الأدمن</Link></div>;

  const act = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => { const { error } = await fn(); setMsg(error ? `خطأ: ${error.message}` : ok); void reload(); };
  const start = () => { if (window.confirm("بدء التحدي الآن؟ هيبدأ لوحة شرف جديدة من الصفر.")) void act(adminStart, "بدأ التحدي ✅"); };
  const exportXlsx = async () => {
    const { data, error } = await adminExport();
    if (error) return setMsg(`خطأ: ${error.message}`);
    const { data: leads } = await supabase.from("profiles").select("phone, lead_status").in("lead_status", ["individual", "organization", "high_intent"]);
    const kind = new Map((leads ?? []).map(l => [l.phone, l.lead_status]));
    const label = (s?: string | null) => s === "individual" ? "مهتم — لنفسه (Apply for the Diploma)" : s === "organization" ? "مهتم — للشركة (Book a Demo Meeting)" : s === "high_intent" ? "نعم" : "لا";
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Leads", { views: [{ rightToLeft: true }] });
    ws.columns = [{ header: "الترتيب", width: 10 }, { header: "الاسم", width: 28 }, { header: "رقم الموبايل", width: 18 }, { header: "اسم الشركة", width: 26 }, { header: "القسم", width: 20 }, { header: "القطاع", width: 26 }, { header: "نوع الاهتمام", width: 36 }];
    ws.getRow(1).font = { bold: true };
    for (const r of (data as Row[]) ?? []) {
      const row = ws.addRow([r.rank ?? "-", r.full_name, r.phone ?? "", r.company_name ?? "", r.department ?? "", r.industry ?? "", label(r.phone ? kind.get(r.phone) : null)]);
      if (r.interested || (r.phone && kind.has(r.phone))) row.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } }; c.font = { color: { argb: "FF006100" }, bold: true }; });
    }
    const buf = await wb.xlsx.writeBuffer(); const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = `hr-cafe-leads-${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
    setMsg(`تم تصدير ${(data as Row[]).length} صف`);
  };
  const step = state?.reveal_step ?? 0;
  return <main className="imp-event imp-bg p-6" dir="rtl">
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between"><h1 className="imp-gold-text text-3xl font-black">لوحة تحكم The HR Café</h1><Link to="/event/arena" target="_blank" className="underline">فتح شاشة المسرح ↗</Link></header>
      <section className="imp-card space-y-2 p-5"><p>بداية التحدي: <b>{state?.started_at ? new Date(state.started_at).toLocaleTimeString("ar-EG") : "لم يبدأ"}</b></p><p>المتسابقين: <b>{state?.count ?? 0}</b> — توصيات صحيحة: <b>{state?.winners.length ?? 0}</b></p><p>حالة الإعلان: <b>{state?.revealed ? "تم الإعلان" : "لم يُعلن"}</b> (خطوة {step}/4)</p></section>
      <button className="imp-btn-gold w-full py-5 text-2xl" onClick={start}>🚀 بدء التحدي الآن / Reset</button>
      <section className="imp-card grid gap-3 p-5 sm:grid-cols-2">{[1, 2, 3, 4].map(s => <button key={s} disabled={!state?.started_at || s !== step + 1} onClick={() => act(() => adminReveal(s), STEPS[s])} className="rounded-xl border border-[#d9b25f]/60 bg-[#A61E25] px-4 py-4 text-lg font-bold disabled:opacity-40">{STEPS[s]}</button>)}
        <button disabled={step === 0} onClick={() => { if (window.confirm("إخفاء النتائج والرجوع لشاشة الانتظار؟")) void act(() => adminReveal(0), "تم الإخفاء"); }} className="rounded-xl border border-white/30 px-4 py-3 disabled:opacity-40 sm:col-span-2">إخفاء النتائج</button></section>
      <button className="w-full rounded-xl border border-emerald-400/60 bg-emerald-700/40 py-4 text-lg font-bold" onClick={exportXlsx}>📊 تصدير شيت الـ Leads (Excel)</button>
      {msg && <p className="text-center font-bold">{msg}</p>}
      <section className="imp-card p-5"><h2 className="mb-2 font-bold">الترتيب الحالي (للأدمن فقط)</h2><ol className="space-y-1 text-sm">{state?.winners.slice(0, 50).map(w => <li key={w.rank}>{w.rank}. {w.name} — {w.discount}%</li>)}</ol></section>
    </div>
  </main>;
}
