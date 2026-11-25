import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import { Download, X } from "lucide-react";
import impLogo from "@/assets/brand/imp-logo.webp";
import analystMark from "@/assets/brand/the-analyst-mark.png";
import type { Voucher } from "./eventApi";
import "./event.css";

export function VoucherCard({ voucher }: { voucher: Voucher }) {
  return <div className="imp-voucher" dir="rtl">
    <div className="shine" aria-hidden />
    <div className="relative flex h-full flex-col justify-between">
      <div className="flex items-center justify-between"><img src={impLogo} alt="IMP" className="h-9 w-auto rounded bg-white/90 p-1" /><span className="imp-gold-text text-xs font-bold tracking-widest" dir="ltr">VIP VOUCHER</span><img src={analystMark} alt="The Analyst" className="h-9 w-auto" /></div>
      <div><p className="text-xs opacity-80">قسيمة معتمدة باسم</p><p className="text-xl font-extrabold">{voucher.name}</p></div>
      <div className="flex items-end justify-between"><div><p className="text-xs opacity-80">نسبة الخصم</p><p className="imp-gold-text text-5xl font-black" dir="ltr">{voucher.discount}%</p></div><div className="text-left"><p className="text-xs opacity-80">كود الخصم</p><p className="rounded-md border border-[#d9b25f] px-2 py-1 font-mono text-sm font-bold" dir="ltr">{voucher.code}</p></div></div>
    </div>
  </div>;
}

export function VoucherModal({ voucher, onClose, celebrate = false }: { voucher: Voucher; onClose: () => void; celebrate?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const download = async () => {
    if (!ref.current) return; setBusy(true);
    try { const url = await toPng(ref.current, { pixelRatio: 3, cacheBust: true }); const a = document.createElement("a"); a.href = url; a.download = "IMP-voucher.png"; a.click(); } finally { setBusy(false); }
  };
  const confetti = celebrate ? Array.from({ length: 40 }, (_, n) => n) : [];
  return <div className="imp-event fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={onClose}>
    {confetti.map(n => <motion.i key={n} className="pointer-events-none fixed top-0 h-3 w-2 rounded-sm" style={{ left: `${(n * 37) % 100}%`, background: n % 3 ? "#d9b25f" : "#A61E25" }} initial={{ y: -20, rotate: 0 }} animate={{ y: "105vh", rotate: 540 }} transition={{ duration: 2.5 + (n % 5) * .4, delay: (n % 8) * .12 }} />)}
    <motion.div initial={{ scale: .6, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", damping: 12 }} className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
      <button aria-label="إغلاق" onClick={onClose} className="self-end rounded-full bg-white/10 p-2"><X className="h-5 w-5" /></button>
      {celebrate && <p className="imp-gold-text text-2xl font-black">🎉 مبروك! قسيمتك اتعتمدت</p>}
      <div ref={ref}><VoucherCard voucher={voucher} /></div>
      <button className="imp-btn-gold flex min-h-12 items-center gap-2 px-6" disabled={busy} onClick={download}><Download className="h-5 w-5" /> 📥 تحميل الكارت</button>
    </motion.div>
  </div>;
}
