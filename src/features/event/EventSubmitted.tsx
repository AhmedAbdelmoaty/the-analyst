import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./event.css";

const TOTAL = 15;
export default function EventSubmitted() {
  const navigate = useNavigate();
  const [left, setLeft] = useState(TOTAL);
  useEffect(() => {
    if (left <= 0) { navigate("/event/offer", { replace: true }); return; }
    const t = window.setTimeout(() => setLeft(v => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, navigate]);
  const r = 34, c = 2 * Math.PI * r;
  return <div className="imp-event fixed inset-0 z-50 grid place-items-center bg-black/75 p-5" dir="rtl">
    <motion.section initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="imp-card imp-glow w-full max-w-md p-7 text-center">
      <div className="text-5xl">⏳</div>
      <h2 className="mt-3 text-xl font-extrabold leading-relaxed">تم توثيق توصيتك بنجاح! سيتم إعلان المراكز الأولى بعد قليل.</h2>
      <div className="mt-6 flex items-center justify-center gap-5">
        <svg width="84" height="84" viewBox="0 0 84 84" aria-label={`${left} ثانية`}><circle cx="42" cy="42" r={r} stroke="rgba(255,255,255,.15)" strokeWidth="6" fill="none" /><circle cx="42" cy="42" r={r} stroke="#d9b25f" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / TOTAL)} transform="rotate(-90 42 42)" style={{ transition: "stroke-dashoffset 1s linear" }} /><text x="42" y="49" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">{left}</text></svg>
        <button className="imp-btn-gold min-h-12 px-5" onClick={() => navigate("/event/offer", { replace: true })}>⬅ متابعة إلى العرض الخاص</button>
      </div>
    </motion.section>
  </div>;
}
