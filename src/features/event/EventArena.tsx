import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Brain, Crown, Database, FileSpreadsheet, Flag, Gamepad2, LayoutDashboard, Play, Settings, Ticket, Timer, X, Zap } from "lucide-react";
import impLogo from "@/assets/brand/imp-logo.webp";
import analystMark from "@/assets/brand/the-analyst-mark.png";
import qr from "@/assets/brand/event-qr.jpg.asset.json";
import { usePublicState, adminStart, adminAnnounce, adminReleaseVouchers, type Winner } from "./eventApi";
import { fanfare, unlockAudio } from "./sounds";
import AdminGate from "./AdminGate";
import "./event.css";

const prizeOf = (w: Winner) => `${w.discount}% OFF`;

function Podium({ w, h, delay }: { w?: Winner; h: string; delay: number }) {
  if (!w) return <div className="w-24 sm:w-36" />;
  return <motion.div className="flex w-24 flex-col items-center sm:w-36" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 13, delay }}>
    {w.rank === 1 && <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }}><Crown className="h-9 w-9 lb-gold" /></motion.div>}
    <p className="mt-1 line-clamp-2 text-center text-sm font-black leading-tight sm:text-lg">{w.name}</p>
    <p className="mb-1 text-xs font-black lb-red sm:text-sm" dir="ltr">{prizeOf(w)}</p>
    <div className={`lb-podium ${w.rank === 1 ? "gold" : ""} grid w-full place-items-center ${h}`}><span className="text-3xl font-black sm:text-5xl">{w.rank}</span></div>
  </motion.div>;
}

const TOOLS = [
  { n: "Excel", I: FileSpreadsheet, c: "ev-excel" }, { n: "Power BI", I: BarChart3, c: "ev-pbi" },
  { n: "SQL", I: Database, c: "ev-sql" }, { n: "Power Automate", I: Zap, c: "ev-pa" },
];

function Arena() {
  const { state, reload } = usePublicState(2000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [menu, setMenu] = useState(false);
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
    setBusy(true); setMsg(""); setMenu(false);
    try { const { error } = await fn(); setMsg(error ? "حصل خطأ، جرّب تاني." : ok); await reload(); }
    catch { setMsg("حصل خطأ، جرّب تاني."); } finally { setBusy(false); }
  };
  const [p1, p2, p3] = [1, 2, 3].map(r => winners.find(w => w.rank === r));
  const results = !!state?.revealed;
  return <main className="imp-light ev-board flex flex-col" dir="ltr" onClick={unlockAudio}>
    <header className="flex items-center justify-center gap-6 px-4 pt-5 sm:gap-14">
      <img src={impLogo} alt="IMP Institute of Management Professionals" className="h-12 w-auto sm:h-20" />
      <span className="h-12 w-px ev-divider sm:h-20" aria-hidden />
      <img src={analystMark} alt="The Analyst" className="h-12 w-auto sm:h-20" />
    </header>
    <div className="relative mx-auto mt-3 px-4 text-center">
      <h1 className="ev-title text-2xl font-black uppercase leading-none sm:text-5xl">
        <span className="ev-spark ev-spark-l" aria-hidden /><span className="ev-dark">The winners of</span><span className="ev-spark ev-spark-r" aria-hidden />
        <span className="mt-2 block lb-red">Data Analysis &amp;</span>
        <span className="block lb-red">Business Intelligence Diploma</span>
      </h1>
      <svg viewBox="0 0 500 20" className="mx-auto mt-1 h-4 w-60 sm:w-[30rem]" aria-hidden><path d="M5 15 Q250 -5 495 15" className="ev-curve" /></svg>
    </div>
    {/* Admin controls stay tucked behind a small gear so the shared screen focuses on the ranking. */}
    <button aria-label="إعدادات" className="fixed bottom-4 left-4 z-40 grid h-11 w-11 place-items-center rounded-full lb-card opacity-40 transition hover:opacity-100" onClick={(e) => { e.stopPropagation(); setMenu(v => !v); }}>{menu ? <X className="h-5 w-5" /> : <Settings className="h-5 w-5" />}</button>
    <AnimatePresence>{menu && <motion.div dir="rtl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed bottom-20 left-4 z-40 flex w-72 flex-col gap-2 rounded-2xl lb-card p-3">
      <button className="lb-btn lb-primary" disabled={busy} onClick={() => act(adminStart, state?.started_at ? "تبدأ جولة جديدة؟ ترتيب الجولة الحالية هيتحفظ في الداشبورد." : "تبدأ التحدي دلوقتي؟", "بدأ التحدي!")}><Play className="h-5 w-5" />{state?.started_at ? "ابدأ تحدي جديد / Reset" : "ابدأ التحدي"}</button>
      {running && <button className="lb-btn lb-goldbtn" disabled={busy} onClick={() => act(adminAnnounce, "تنهي التحدي وتعرض النتائج؟ اللي يخلص بعد كده مش هيدخل الترتيب.", "تم إعلان النتائج")}><Flag className="h-5 w-5" />إنهاء التحدي وإظهار النتائج</button>}
      {results && <button className="lb-btn lb-ghost" disabled={busy || !!state?.vouchers_released_at} onClick={() => act(adminReleaseVouchers, "تبعت القسائم للفائزين دلوقتي؟", "تم إرسال القسائم")}><Ticket className="h-5 w-5" />{state?.vouchers_released_at ? "القسائم اتبعتت ✓" : "إرسال القسائم للفائزين"}</button>}
      <Link to="/admin/event-dashboard" className="lb-btn lb-ghost"><LayoutDashboard className="h-5 w-5" />الداشبورد</Link>
      {running && <p className="text-center text-sm font-bold tabular-nums" dir="ltr">⏱ {clock}</p>}
    </motion.div>}</AnimatePresence>
    {msg && <p role="status" dir="rtl" className="text-center font-bold lb-red">{msg}</p>}
    <section className={`mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 items-start gap-5 px-4 pb-8 pt-4 lg:px-8 ${results ? "lg:grid-cols-[1fr_1.9fr_1fr]" : "lg:grid-cols-[1fr_1fr_1fr]"}`}>
      <div className="lb-card ev-side order-2 flex flex-col items-center gap-4 p-6 text-center lg:order-1 lg:mt-6">
        <div className="flex items-center gap-4 lb-red"><Brain className="h-14 w-14 sm:h-20 sm:w-20" strokeWidth={1.6} /><span className="h-14 w-0.5 ev-redline" /><Gamepad2 className="h-14 w-14 sm:h-20 sm:w-20" strokeWidth={1.6} /></div>
        <p className="text-xl font-black uppercase leading-tight lb-red sm:text-3xl">Analytical Thinking<br />Game-Based Learning</p>
      </div>
      <div className="order-1 flex flex-col items-center lg:order-2">
        <AnimatePresence mode="wait">
          {!results && <motion.div key="qr" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .9 }} className="flex flex-col items-center pt-6 lg:pt-20">
            <img src={qr.url} alt="QR code — scan to join" className="w-56 max-w-full mix-blend-multiply sm:w-80" />
          </motion.div>}
          {results && winners.length === 0 && <motion.p key="none" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-3xl font-black">مفيش حد وصل للحل الصح المرة دي!</motion.p>}
          {results && winners.length > 0 && <motion.div key="res" className="flex w-full flex-col items-center gap-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-end justify-center gap-3 sm:gap-5"><Podium w={p2} h="h-24 sm:h-32" delay={.6} /><Podium w={p1} h="h-32 sm:h-44" delay={1.1} /><Podium w={p3} h="h-16 sm:h-24" delay={.2} /></div>
            {winners.length > 3 && <div className="ev-list grid w-full grid-cols-1 gap-2 overflow-y-auto pe-1 sm:grid-cols-2">
              {winners.filter(w => w.rank > 3).map((w, i) => <motion.div key={w.rank} className="lb-card flex items-center gap-3 px-3 py-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 + Math.min(i, 30) * .05 }}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full lb-podium lb-round font-black">{w.rank}</span>
                <span className="flex-1 truncate text-right font-bold" dir="auto">{w.name}</span><span className="text-sm font-black lb-red">{prizeOf(w)}</span></motion.div>)}
            </div>}
          </motion.div>}
        </AnimatePresence>
      </div>
      <div className="lb-card ev-side order-3 flex flex-col items-center gap-4 p-6 text-center lg:mt-6">
        <p className="w-full border-b pb-3 text-xl font-black uppercase lb-red sm:text-2xl">Data Analysis Tools</p>
        <div className="grid w-full grid-cols-4 divide-x">
          {TOOLS.map(({ n, I, c }) => <div key={n} className="flex flex-col items-center gap-2 px-1"><I className={`h-10 w-10 sm:h-12 sm:w-12 ${c}`} strokeWidth={1.8} /><span className="text-xs font-bold sm:text-sm">{n}</span></div>)}
        </div>
      </div>
    </section>
  </main>;
}

export default function EventArena() { return <AdminGate><Arena /></AdminGate>; }
