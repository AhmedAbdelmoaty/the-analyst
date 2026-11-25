import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CINE, preload, type CineKey } from "./cinematic";

/** Layered scene: keeps the current art visible until the next one is decoded, then crossfades. */
export function CinematicScene({ k, zoom = false }: { k: CineKey; zoom?: boolean }) {
  const [shown, setShown] = useState<CineKey>(k);
  const reduce = useReducedMotion();
  useEffect(() => {
    let live = true;
    void preload(CINE[k].src).then(() => { if (live) setShown(k); });
    return () => { live = false; };
  }, [k]);
  const s = CINE[shown];
  const drive = s.preset === "drive";
  return <div className={`g-cine preset-${s.preset}`} aria-hidden>
    <AnimatePresence initial={false}>
      <motion.div key={shown} className="g-cine-layer" initial={{ opacity: 0, scale: reduce ? 1 : 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { delay: .42, duration: .01 } }} transition={{ duration: .45, ease: [.22, 1, .36, 1] }}>
        <img className="g-cine-amb" src={s.src} alt="" />
        <div className="g-cine-frame">
          <motion.div className="g-cine-rig" animate={drive && !reduce ? { y: [0, -1.6, 1, -.8, 1.3, 0], x: [0, .8, -.5, 1, -.6, 0], rotate: [0, .12, -.1, .08, 0] } : { y: 0, x: 0 }} transition={drive ? { duration: .45, repeat: Infinity, ease: "easeInOut" } : { duration: .3 }}>
            <motion.img className="g-cine-img" src={s.src} alt="" style={{ objectPosition: s.focus }} animate={{ scale: zoom ? 1.07 : 1.0 }} transition={{ duration: 1.2, ease: [.22, 1, .36, 1] }} />
          </motion.div>
          {drive && !reduce && <div className="g-cine-streaks">{[0, 1, 2, 3].map((i) => <i key={i} style={{ top: `${22 + i * 17}%`, animationDelay: `${i * .28}s` }} />)}</div>}
        </div>
      </motion.div>
    </AnimatePresence>
    <div className="g-cine-scrim" />
    {(s.preset === "victory" || s.preset === "failure" || s.preset === "timeout") && <div className={`g-cine-fx fx-${s.preset}`}>{s.preset !== "timeout" && Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * .22}s` }} />)}</div>}
  </div>;
}
