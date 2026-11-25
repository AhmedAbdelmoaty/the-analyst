import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import impLogo from "@/assets/brand/imp-logo.webp";
import analystMark from "@/assets/brand/the-analyst-mark.png";
import "./event.css";

const POINTS = [
  "إتقان عملي كامل لأقوى أدوات التحليل وذكاء الأعمال من الصفر حتى بناء الـ Dashboards الاحترافية.",
  "منهجية التفكير التحليلي وحل المشكلات المعقدة وصناعة القرارات الإدارية السليمة.",
  "تطبيق عملي وتدريب يحاكي تحديات الشركات الواقعية وقياس أثر التدريب والاستثمار.",
];
export default function EventOffer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const interested = async () => {
    if (!user) return navigate("/login");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ lead_status: "high_intent", lead_at: new Date().toISOString() }).eq("user_id", user.id);
    setBusy(false);
    if (!error) setDone(true);
  };
  return <main className="imp-event imp-bg px-5 py-10" dir="rtl">
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-7 text-center">
      <div className="flex items-center gap-4"><img src={impLogo} alt="IMP" className="h-12 w-auto rounded bg-white/90 p-1.5" /><span className="h-8 w-px bg-white/30" /><img src={analystMark} alt="The Analyst" className="h-12 w-auto" /></div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl font-black leading-relaxed sm:text-4xl">التحليل مش مجرد أرقام وتولز.. <span className="imp-gold-text">التحليل قرارات تحمي ميزانية شركتك وتصنع فارقاً حقيقياً!</span></motion.h1>
      <div><h2 className="text-lg font-bold sm:text-xl">دبلومة تحليل البيانات وذكاء الأعمال والتفكير التحليلي من IMP</h2><p className="mt-1 text-sm opacity-75" dir="ltr">(Data Analytics & Business Intelligence + Analytical Thinking)</p></div>
      <ol className="grid w-full gap-3 text-right">{POINTS.map((p, i) => <motion.li key={p} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .2 + i * .15 }} className="imp-card flex items-start gap-3 p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#A61E25] font-black text-[#f3dc9b]">{i + 1}</span><span className="leading-relaxed">{p}</span></motion.li>)}</ol>
      {done ? <motion.p initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-start gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-600/20 p-4 font-bold text-emerald-200"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />تم تسجيل اهتمامك بنجاح! فريق IMP بانتظارك في الـ Booth لاستلام خطتك التدريبية واستشارتك المجانية.</motion.p>
        : <button className="imp-btn-gold imp-pulse min-h-14 w-full px-5 text-base sm:text-lg" disabled={busy} onClick={interested}>🎯 مهتم بتطوير مهاراتي / تدريب فريقي - زُرنا في الـ Booth</button>}
    </div>
  </main>;
}
