import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import impLogo from "@/assets/brand/imp-logo.webp";
import analystMark from "@/assets/brand/the-analyst-mark.png";
import { PRIZES, placeName, usePublicState, type Winner } from "./eventApi";
import { drumroll, fanfare, unlockAudio } from "./sounds";
import "./event.css";

const HYPE = ["مين هيحسم المركز الأول؟", "المنافسة مشتعلة على القمة!", "دقائق تفصلنا عن إعلان أبطال التحدي..."];
const PRIZE_BY_RANK: Record<number, string> = { 1: "دبلومة كاملة 100% مجاناً", 2: "خصم 75%", 3: "خصم 50%" };

function WinnerCard({ w, big = false }: { w: Winner; big?: boolean }) {
  return <motion.div initial={{ scale: .5, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 11 }} className={`imp-card imp-glow text-center ${big ? "px-10 py-10" : "px-8 py-6"}`}>
    <div className={big ? "text-7xl" : "text-5xl"}>{w.rank === 1 ? "🥇" : w.rank === 2 ? "🥈" : "🥉"}</div>
    <p className="mt-2 text-lg opacity-80">{placeName(w.rank)}</p>
    <p className={`imp-gold-text font-black ${big ? "text-5xl sm:text-7xl" : "text-3xl sm:text-5xl"}`}>{w.name}</p>
    <p className={`mt-3 font-bold ${big ? "text-2xl" : "text-xl"}`}>{PRIZE_BY_RANK[w.rank]}</p>
    {w.rank === 1 && <p className="mt-1 text-sm opacity-75" dir="ltr">Data Analytics & Business Intelligence + Analytical Thinking</p>}
  </motion.div>;
}

export default function EventArena() {
  const { state } = usePublicState(5000);
  const [hype, setHype] = useState(0);
  const [suspense, setSuspense] = useState(false);
  const prevStep = useRef<number | null>(null);
  useEffect(() => { const t = window.setInterval(() => setHype(h => (h + 1) % HYPE.length), 4000); return () => window.clearInterval(t); }, []);
  const step = state?.reveal_step ?? 0;
  useEffect(() => {
    if (prevStep.current === null) { prevStep.current = step; return; }
    if (step > prevStep.current) {
      if (step === 3) { setSuspense(true); drumroll(2); window.setTimeout(() => { setSuspense(false); fanfare(); }, 2600); }
      else fanfare();
    }
    prevStep.current = step;
  }, [step]);
  const w = (r: number) => state?.winners.find(x => x.rank === r);
  const rest = (state?.winners ?? []).filter(x => x.rank > 3);
  const confetti = step >= 3 && !suspense ? Array.from({ length: 70 }, (_, n) => n) : [];

  return <main className="imp-event imp-bg relative flex flex-col overflow-hidden" dir="rtl" onClick={unlockAudio}>
    <header className="flex items-center justify-between px-8 py-5"><img src={impLogo} alt="IMP" className="h-14 w-auto rounded bg-white/90 p-1.5" /><h1 className="imp-gold-text text-2xl font-black sm:text-4xl" dir="ltr">The HR Café Challenge</h1><img src={analystMark} alt="The Analyst" className="h-14 w-auto" /></header>

    {step === 0 && <section className="flex flex-1 flex-col items-center justify-center gap-10 px-6 text-center">
      <motion.p className="imp-pulse text-4xl font-black sm:text-6xl">👥 <span className="imp-gold-text">{state?.count ?? 0}</span> متسابق يخوضون التحدي الآن...</motion.p>
      <AnimatePresence mode="wait"><motion.p key={hype} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="text-2xl font-bold opacity-90 sm:text-3xl">{HYPE[hype]}</motion.p></AnimatePresence>
    </section>}

    {step >= 1 && <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      {step >= 3 && !suspense && w(1) && <WinnerCard w={w(1)!} big />}
      <div className="flex flex-wrap items-stretch justify-center gap-6">{step >= 2 && w(2) && <WinnerCard w={w(2)!} />}{w(3) && <WinnerCard w={w(3)!} />}</div>
      {step >= 4 && rest.length > 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="imp-card mt-4 w-full max-w-5xl p-5"><h2 className="mb-3 text-center text-xl font-bold">🎖️ المراكز من 4 إلى 50 — قسيمة خصم 25%</h2><ol className="grid grid-cols-2 gap-x-6 gap-y-1 text-lg sm:grid-cols-3 lg:grid-cols-4">{rest.map(x => <li key={x.rank}><span className="imp-gold-text font-black">{x.rank}.</span> {x.name}</li>)}</ol></motion.div>}
    </section>}

    <AnimatePresence>{suspense && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 grid place-items-center bg-black px-6 text-center"><motion.p initial={{ scale: .8 }} animate={{ scale: 1.05 }} transition={{ duration: 2.4 }} className="imp-gold-text text-4xl font-black sm:text-7xl">والآن... بطل التحدي وصاحب المركز الأول!</motion.p></motion.div>}</AnimatePresence>
    {confetti.map(n => <motion.i key={n} className="pointer-events-none fixed top-0 z-30 h-4 w-2 rounded-sm" style={{ left: `${(n * 37) % 100}%`, background: ["#d9b25f", "#A61E25", "#fff"][n % 3] }} initial={{ y: -30 }} animate={{ y: "110vh", rotate: 720 }} transition={{ duration: 3 + (n % 6) * .5, delay: (n % 10) * .2, repeat: 2 }} />)}

    <footer className="imp-marquee imp-glow border-t border-[#d9b25f]/40 bg-black/60 py-4 text-xl font-bold"><div>{[...PRIZES, ...PRIZES].map((p, i) => <span key={i}>{p.icon} {p.place}: <span className="imp-gold-text">{p.prize}</span>{p.sub && <small className="mx-2 opacity-70" dir="ltr">({p.sub})</small>}</span>)}</div></footer>
  </main>;
}
