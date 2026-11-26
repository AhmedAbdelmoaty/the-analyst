import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { adminExport, usePublicState } from "./eventApi";
import "./event.css";

type Row = { rank: number | null; full_name: string; phone: string | null; company_name: string | null; department: string | null; industry: string | null; interested: boolean | null };


export default function AdminEventArena() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { state } = usePublicState(4000);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    void (supabase.rpc as unknown as (f: string, a: object) => Promise<{ data: boolean }>)("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);
  if (loading || isAdmin === null) return <p className="p-8 text-center">جاري التحميل...</p>;
  if (!isAdmin) return <div className="p-8 text-center">غير مصرح. <Link className="underline" to="/admin/login">دخول الأدمن</Link></div>;

  const exportXlsx = async () => {
    const { data, error } = await adminExport();
    if (error) return setMsg(`خطأ: ${error.message}`);
    const phones = ((data as Row[]) ?? []).flatMap(r => r.phone ? [r.phone] : []);
    const { data: leads, error: profileError } = phones.length ? await supabase.from("profiles").select("phone, email, lead_status").in("phone", phones) : { data: [], error: null };
    if (profileError) return setMsg("تعذر تحميل بيانات التسجيل للتصدير. حاول تاني.");
    const kind = new Map((leads ?? []).map(l => [l.phone, l.lead_status]));
    const emails = new Map((leads ?? []).map(l => [l.phone, l.email]));
    const label = (s?: string | null) => s === "individual" ? "مهتم — لنفسه (Apply for the Diploma)" : s === "organization" ? "مهتم — للشركة (Book a Demo Meeting)" : s === "high_intent" ? "نعم" : "لا";
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Leads", { views: [{ rightToLeft: true }] });
    ws.columns = [{ header: "الترتيب", width: 10 }, { header: "الاسم", width: 28 }, { header: "رقم الموبايل", width: 18 }, { header: "البريد الإلكتروني", width: 32 }, { header: "اسم الشركة", width: 26 }, { header: "القسم", width: 20 }, { header: "نوع الاهتمام", width: 36 }];
    ws.getRow(1).font = { bold: true };
    for (const r of (data as Row[]) ?? []) {
      const row = ws.addRow([r.rank ?? "-", r.full_name, r.phone ?? "", r.phone ? emails.get(r.phone) ?? "" : "", r.company_name ?? "", r.department ?? "", label(r.phone ? kind.get(r.phone) : null)]);
      if (r.interested || (r.phone && ["individual", "organization", "high_intent"].includes(kind.get(r.phone) ?? ""))) row.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } }; c.font = { color: { argb: "FF006100" }, bold: true }; });
    }
    const buf = await wb.xlsx.writeBuffer(); const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = `hr-cafe-leads-${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
    setMsg(`تم تصدير ${(data as Row[]).length} صف`);
  };
  return <main className="imp-event imp-bg p-6" dir="rtl">
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between"><h1 className="imp-gold-text text-3xl font-black">لوحة تحكم The HR Café</h1><Link to="/event/arena" target="_blank" className="underline">فتح شاشة المسرح ↗</Link></header>
      <section className="imp-card space-y-2 p-5"><p>بداية التحدي: <b>{state?.started_at ? new Date(state.started_at).toLocaleTimeString("ar-EG") : "لم يبدأ"}</b></p><p>المتسابقين: <b>{state?.count ?? 0}</b> — توصيات صحيحة: <b>{state?.winners.length ?? 0}</b></p><p>النتائج بتظهر تلقائيًا على شاشة التحدي.</p></section>
      <Link to="/event/arena" className="imp-btn-gold block py-4 text-center text-xl">شاشة التحدي وبدء التحدي</Link>
      <button className="w-full rounded-xl border border-emerald-400/60 bg-emerald-700/40 py-4 text-lg font-bold" onClick={exportXlsx}>📊 تصدير شيت الـ Leads (Excel)</button>
      {msg && <p className="text-center font-bold">{msg}</p>}
      <section className="imp-card p-5"><h2 className="mb-2 font-bold">الترتيب الحالي (للأدمن فقط)</h2><ol className="space-y-1 text-sm">{state?.winners.slice(0, 50).map(w => <li key={w.rank}>{w.rank}. {w.name} — {w.discount}%</li>)}</ol></section>
    </div>
  </main>;
}
