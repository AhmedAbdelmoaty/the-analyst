import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";
import { GameButton } from "./GameButton";
import { useRuntime } from "./runtime";
import { startRingtone, sfx } from "./audio";

export function IncomingCall({ name, role, image, onAnswer }: { name: string; role?: string; image: string; onAnswer: () => void }) {
  const { paused } = useRuntime();
  const reducedMotion = useReducedMotion();
  useEffect(() => { if (!paused) return startRingtone(); }, [paused]);
  return <div className="g-stage center"><motion.section className="g-incoming-phone" aria-label={`مكالمة واردة من ${name}`} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
    <div className="g-phone-speaker" aria-hidden />
    <div className="g-phone-screen"><p>مكالمة واردة</p>
      <motion.div className="g-phone-avatar" animate={reducedMotion ? undefined : { scale: [1, 1.06, 1] }} transition={{ duration: 1.2, repeat: Infinity }}><i aria-hidden /><img src={image} alt={name} /></motion.div>
      <h2>{name}</h2>{role && <p>{role}</p>}<span className="g-phone-ringing"><Phone size={16} /> بيرن…</span>
    </div>
    <div className="g-phone-actions"><GameButton className="g-phone-decline" disabled aria-label="رفض المكالمة غير متاح"><PhoneOff /></GameButton><GameButton className="g-phone-answer" aria-label="الرد على المكالمة" onClick={() => { sfx.tap(); onAnswer(); }}><Phone /></GameButton></div>
  </motion.section></div>;
}