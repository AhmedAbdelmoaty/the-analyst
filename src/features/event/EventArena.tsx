import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Flag, LayoutDashboard, Play, Ticket, Timer, Users } from "lucide-react";
import impLogo from "@/assets/brand/imp-logo.webp";
import analystMark from "@/assets/brand/the-analyst-mark.png";
import { placeName, usePublicState, adminStart, adminAnnounce, adminReleaseVouchers, type Winner } from "./eventApi";
import { fanfare, unlockAudio } from "./sounds";
import AdminGate from "./AdminGate";
import "./event.css";

const PRIZE: Record<number, string> = { 1: "دبلومة كاملة مجانًا", 2: "خصم 75%", 3: "خصم 50%" };
const prizeOf = (w: Winner) => PRIZE[w.rank] ?? (w.discount ? `خصم ${w.discount}%` : "");

function Podium({ w, h, delay }: { w?: Winner; h: string; delay: number }) {
  if (!w) return <div className="w-28 sm:w-44" />;
  return <motion.div className="flex w-28 flex-col items-center sm:w-44" initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 13, delay }}>
    {w.rank === 1 && <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }}><Crown className="h-10 w-10 lb-gold" /></motion.div>}
    <p className="mt-1 text-center text-base font-black leading-tight sm:text-2xl">{w.name}</p>
    <p className="mb-2 text-xs font-bold lb-red sm:text-sm">{prizeOf(w)}</p>
    <div className={`lb-podium ${w.rank === 1 ? "gold" : ""} grid w-full place-items-center ${h}`}><span className="text-4xl font-black sm:text-6xl">{w.rank}</span></div>
  </motion.div>;
}

function Arena() {
  const { state, reload } = usePublicState(2000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [tick, setTick] = useState(Date.now());
  const winners = state?.winners ?? [];
  const prev = useRef(0);
  useEffect(() => { if (winners.length > prev.current) fanfare(); prev.current = winners.length; }, [winners.length]);
  useEffect(() => { const id = window.setInterval(() => setTick(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const skew = state?.now ? Date.parse(state.now) - Date.now() : 0;
  const running = !!state?.started_at && !state.revealed;
  const el = running ? Math.max(0, tick + skew - Date.parse(state!.started_at!)) : 0;
  const clock = `${String(Math.floor(el / 60000)).padStart(2, "0")}:${String(Math.floor(el / 1000) % 60).padStart(2, "0")}`;
  const act = async (fn: () => Promise<{ error: unknown }>, confirmText: string, ok: string) => {
    if (!window.confirm(confirmText)) return;
    setBusy(true); setMsg("");
    try { const { error } = await fn(); setMsg(error ? "حصل خطأ، جرّب تاني." : ok); await reload(); }
    catch { setMsg("حصل خطأ، جرّب تاني."); } finally { setBusy(false); }
  };
  const [p1, p2, p3] = [1, 2, 3].map(r => winners.find(w => w.rank === r));
  return <main className="imp-light flex flex-col" dir="rtl" onClick={unlockAudio}>
    <header className="flex items-center justify-between px-5 py-4 sm:px-10">
      <img src={impLogo} alt="IMP" className="h-11 w-auto sm:h-14" />
      <h1 className="lb-shimmer text-center text-2xl font-black sm:text-5xl" dir="ltr">The HR Café Challenge</h1>
      <img src={analystMark} alt="The Analyst" className="h-11 w-auto sm:h-14" />
    </header>
    <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-4">
      <button className="lb-btn lb-primary" disabled={busy} onClick={() => act(adminStart, state?.started_at ? "تبدأ تحدي جديد؟ كل النتائج الحالية هتتصفّر." : "تبدأ التحدي دلوقتي؟", "بدأ التحدي!")}><Play className="h-5 w-5" />{state?.started_at ? "ابدأ تحدي جديد / Reset" : "ابدأ التحدي"}</button>
      {running && <button className="lb-btn lb-goldbtn" disabled={busy} onClick={() => act(adminAnnounce, "تنهي التحدي وتعرض النتائج؟ اللي يخلص بعد كده مش هيدخل الترتيب.", "تم إعلان النتائج")}><Flag className="h-5 w-5" />إنهاء التحدي وإظهار النتائج</button>}
      {state?.revealed && <button className="lb-btn lb-ghost" disabled={busy || !!state.vouchers_released_at} onClick={() => act(adminReleaseVouchers, "تبعت القسائم للفائزين دلوقتي؟", "تم إرسال القسائم")}><Ticket className="h-5 w-5" />{state.vouchers_released_at ? "القسائم اتبعتت ✓" : "إرسال القسائم للفائزين"}</button>}
      <Link to="/admin/event-dashboard" className="lb-btn lb-ghost"><LayoutDashboard className="h-5 w-5" />الداشبورد</Link>
    </div>
    {msg && <p role="status" className="text-center font-bold lb-red">{msg}</p>}
    <section className="flex flex-1 flex-col items-center gap-6 px-4 pb-10 pt-4 text-center">
      <div className="flex flex-wrap justify-center gap-3">
        <span className="lb-card flex items-center gap-2 px-5 py-2 text-lg font-bold"><Users className="h-5 w-5 lb-red" />{state?.count ?? 0} مشارك</span>
        <span className="lb-card flex items-center gap-2 px-5 py-2 text-lg font-bold"><Flag className="h-5 w-5 lb-red" />{state?.finished ?? 0} خلّصوا</span>
      </div>
      <AnimatePresence mode="wait">
        {!state?.started_at && <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="my-auto text-3xl font-black">مستنيين بداية التحدي…</motion.p>}
        {running && <motion.div key="run" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="my-auto flex flex-col items-center gap-3">
          <Timer className="h-12 w-12 lb-red" /><p className="text-3xl font-black">التحدي شغّال… النتائج هتظهر في الآخر</p>
          <p className="text-7xl font-black tabular-nums lb-red sm:text-8xl" dir="ltr">{clock}</p></motion.div>}
        {state?.revealed && winners.length === 0 && <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-auto text-3xl font-black">مفيش حد وصل للحل الصح المرة دي!</motion.p>}
        {state?.revealed && winners.length > 0 && <motion.div key="res" className="flex w-full max-w-5xl flex-col items-center gap-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-end justify-center gap-3 sm:gap-6"><Podium w={p2} h="h-28 sm:h-40" delay={.6} /><Podium w={p1} h="h-40 sm:h-56" delay={1.1} /><Podium w={p3} h="h-20 sm:h-28" delay={.2} /></div>
          {winners.length > 3 && <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {winners.filter(w => w.rank > 3).map((w, i) => <motion.div key={w.rank} className="lb-card flex items-center gap-3 px-4 py-3 text-right" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5 + Math.min(i, 30) * .06 }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full lb-podium lb-round text-lg font-black">{w.rank}</span>
              <span className="flex-1 truncate text-lg font-bold">{w.name}</span><span className="text-sm font-bold lb-gold">{prizeOf(w) || placeName(w.rank)}</span></motion.div>)}
          </div>}
        </motion.div>}
      </AnimatePresence>
    </section>
  </main>;
}

export default function EventArena() { return <AdminGate><Arena /></AdminGate>; }
