import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import impLogo from "@/assets/brand/imp-logo.webp";
import analystMark from "@/assets/brand/the-analyst-mark.png";
import { PRIZES, placeName, usePublicState, adminStart, type Winner } from "./eventApi";
import { fanfare, unlockAudio } from "./sounds";
import "./event.css";

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
  const { state, reload } = usePublicState(2000);
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const previousCount = useRef<number | null>(null);
  useEffect(() => {
    let active = true;
    setIsAdmin(false);
    if (user) void supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => { if (active) setIsAdmin(data === true); });
    return () => { active = false; };
  }, [user]);
  const winners = state?.winners ?? [];
  useEffect(() => {
    if (previousCount.current !== null && winners.length > previousCount.current) fanfare();
    previousCount.current = winners.length;
  }, [winners.length]);
  const start = async () => {
    if (state?.started_at && !window.confirm("تبدأ تحدي جديد؟ الترتيب الحالي هيبدأ من الصفر، والنتائج القديمة محفوظة.")) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await adminStart();
      setMessage(error ? "تعذر بدء التحدي، جرّب تاني." : "بدأ التحدي!");
      await reload();
    } catch { setMessage("تعذر بدء التحدي، جرّب تاني."); }
    finally { setBusy(false); }
  };
  return <main className="imp-event imp-bg relative flex flex-col overflow-hidden" dir="rtl" onClick={unlockAudio}>
    <header className="flex items-center justify-between px-8 py-5"><img src={impLogo} alt="IMP" className="h-14 w-auto rounded bg-white/90 p-1.5" /><h1 className="imp-gold-text text-2xl font-black sm:text-4xl" dir="ltr">The HR Café Challenge</h1><img src={analystMark} alt="The Analyst" className="h-14 w-auto" /></header>

    {isAdmin && <div className="flex flex-col items-center gap-2 px-6 pb-4">
      <Button className="imp-btn-gold px-8 py-4 text-xl" disabled={busy} onClick={start}><Play className="h-5 w-5" />{busy ? "جاري البدء..." : "ابدأ التحدي"}</Button>
      {message && <p role="status">{message}</p>}
    </div>}
    <section className="flex flex-1 flex-col items-center gap-6 px-6 pb-8 text-center">
      <p className="text-2xl font-bold">👥 <span className="imp-gold-text">{state?.count ?? 0}</span> مشارك — <span className="imp-gold-text">{winners.length}</span> في لوحة الشرف</p>
      {!state?.started_at && <p className="my-auto text-3xl font-bold">مستنيين بداية التحدي!</p>}
      {state?.started_at && winners.length === 0 && <p className="my-auto text-3xl font-bold">التحدي بدأ… مين هيحسم المركز الأول؟</p>}
      {winners.length > 0 && <div className="flex w-full max-w-6xl flex-wrap items-stretch justify-center gap-5">{winners.filter(w => w.rank <= 3).map(w => <WinnerCard key={w.rank} w={w} />)}</div>}
      {winners.some(w => w.rank > 3) && <div className="imp-card w-full max-w-5xl p-5"><h2 className="mb-3 text-xl font-bold">🎖️ المراكز من 4 إلى 50 — قسيمة خصم 25%</h2><ol className="grid grid-cols-1 gap-x-6 gap-y-2 text-lg sm:grid-cols-2 lg:grid-cols-4">{winners.filter(w => w.rank > 3).map(w => <li key={w.rank}><span className="imp-gold-text font-black">{w.rank}.</span> {w.name}</li>)}</ol></div>}
    </section>

    <footer className="imp-marquee imp-glow border-t border-[#d9b25f]/40 bg-black/60 py-4 text-xl font-bold"><div>{[...PRIZES, ...PRIZES].map((p, i) => <span key={i}>{p.icon} {p.place}: <span className="imp-gold-text">{p.prize}</span>{p.sub && <small className="mx-2 opacity-70" dir="ltr">({p.sub})</small>}</span>)}</div></footer>
  </main>;
}
