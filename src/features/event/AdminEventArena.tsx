import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ExcelJS from "exceljs";
import { Download, RefreshCw, Trophy } from "lucide-react";
import { adminExport, usePublicState } from "./eventApi";
import AdminGate from "./AdminGate";
import "./event.css";

type Row = { rank: number | null; full_name: string; phone: string | null; email: string | null; company_name: string | null; department: string | null; lead_status: string | null; correct: boolean; duration_seconds: number | null; finished_at: string | null };
const interest = (s?: string | null) => s === "individual" ? "لنفسه (Apply for the Diploma)" : s === "organization" ? "للمنظمة (Book a Demo Meeting)" : s === "high_intent" ? "مهتم" : "—";
const dur = (s: number | null) => s == null ? "—" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Dashboard() {
  const { state } = usePublicState(5000);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => { const { data, error } = await adminExport(); if (error) setMsg("تعذر تحميل البيانات."); else setRows((data as Row[]) ?? []); }, []);
  useEffect(() => { void load(); const t = window.setInterval(load, 10000); return () => window.clearInterval(t); }, [load]);
  const exportXlsx = async () => {
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("HR Cafe", { views: [{ rightToLeft: true }] });
    ws.columns = [["الترتيب", 10], ["الاسم", 28], ["رقم الموبايل", 18], ["البريد الإلكتروني", 32], ["القسم", 18], ["الاهتمام", 34], ["الحل صح؟", 10], ["وقت اللعب", 12]].map(([header, width]) => ({ header: header as string, width: width as number }));
    ws.getRow(1).font = { bold: true };
    for (const r of rows) {
      const row = ws.addRow([r.rank ?? "-", r.full_name, r.phone ?? "", r.email ?? "", r.department ?? "", interest(r.lead_status), r.correct ? "نعم" : "لا", dur(r.duration_seconds)]);
      if (["individual", "organization", "high_intent"].includes(r.lead_status ?? "")) row.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } }; c.font = { color: { argb: "FF006100" }, bold: true }; });
    }
    const buf = await wb.xlsx.writeBuffer(); const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = `hr-cafe-${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
    setMsg(`تم تصدير ${rows.length} صف`);
  };
  return <main className="imp-light p-4 sm:p-8" dir="rtl">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-black lb-red">داشبورد The HR Café</h1>
        <div className="flex flex-wrap gap-2"><Link to="/event/arena" className="lb-btn lb-ghost"><Trophy className="h-5 w-5" />الليدربورد</Link><button className="lb-btn lb-ghost" onClick={() => void load()}><RefreshCw className="h-5 w-5" />تحديث</button><button className="lb-btn lb-primary" onClick={exportXlsx}><Download className="h-5 w-5" />تصدير Excel</button></div></header>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["بداية التحدي", state?.started_at ? new Date(state.started_at).toLocaleTimeString("ar-EG") : "لم يبدأ"], ["المشاركين", rows.length], ["حل صح", rows.filter(r => r.correct).length], ["مهتمين", rows.filter(r => r.lead_status && r.lead_status !== "none").length]].map(([k, v]) => <div key={k as string} className="lb-card p-4"><p className="text-sm opacity-70">{k}</p><p className="text-2xl font-black lb-red">{v}</p></div>)}
      </section>
      {msg && <p className="text-center font-bold lb-red">{msg}</p>}
      <div className="lb-card overflow-x-auto"><table className="w-full min-w-[820px] text-right text-sm">
        <thead><tr className="border-b">{["#", "الاسم", "الموبايل", "الإيميل", "القسم", "الاهتمام", "صح؟", "الوقت"].map(h => <th key={h} className="p-3 font-black">{h}</th>)}</tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={8} className="p-6 text-center opacity-60">لسه مفيش مشاركين في التحدي الحالي</td></tr> : rows.map((r, i) => <tr key={i} className="border-b last:border-0">
          <td className="p-3 font-black lb-red">{r.rank ?? "—"}</td><td className="p-3 font-bold">{r.full_name}</td><td className="p-3" dir="ltr">{r.phone}</td><td className="p-3" dir="ltr">{r.email}</td><td className="p-3">{r.department}</td><td className="p-3">{interest(r.lead_status)}</td><td className="p-3">{r.correct ? "✅" : "—"}</td><td className="p-3 tabular-nums">{dur(r.duration_seconds)}</td></tr>)}</tbody>
      </table></div>
    </div>
  </main>;
}

export default function AdminEventArena() { return <AdminGate><Dashboard /></AdminGate>; }
