import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CINE, CINE_LOCATION, preload, type CineKey } from "./cinematic";

/** Layered scene: keeps the current art visible until the next one is decoded, then crossfades. */
export function CinematicScene({ k, zoom = false }: { k: CineKey; zoom?: boolean }) {
  const [{ shown, cut }, setScene] = useState({ shown: k, cut: false });
  const reduce = useReducedMotion();
  useEffect(() => {
    let live = true;
    void preload(CINE[k].src).then(() => {
      if (live) setScene(previous => previous.shown === k ? previous : {
        shown: k, cut: CINE_LOCATION[previous.shown] !== CINE_LOCATION[k],
      });
    });
    return () => { live = false; };
  }, [k]);
  const s = CINE[shown];
  const drive = s.preset === "drive";
  return <div className="g-cine" aria-hidden>
    <AnimatePresence initial={false}>
      <motion.div key={shown} className={`g-cine-layer preset-${s.preset} shot-${shown}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: reduce ? 0 : .5, duration: .01 } }} transition={{ duration: reduce ? .12 : .5, ease: [.22, 1, .36, 1] }}>
        <img className="g-cine-amb" src={s.src} alt="" />
        <div className="g-cine-frame">
          <div className="g-cine-rig">
            <div className={`g-cine-focus ${zoom && !reduce ? "is-focused" : ""}`}>
              <img className="g-cine-img" src={s.src} alt="" style={{ objectPosition: s.focus, transformOrigin: s.focus }} />
            </div>
          </div>
          {drive && !reduce && <div className="g-cine-streaks">{[0, 1, 2, 3].map((i) => <i key={i} />)}</div>}
        </div>
        <div className="g-cine-scrim" />
        {drive && <div className="g-cine-speed-shade" />}
        {(s.preset === "victory" || s.preset === "failure" || s.preset === "timeout") && <div className={`g-cine-fx fx-${s.preset}`} />}
      </motion.div>
    </AnimatePresence>
    {cut && !reduce && <div key={shown} className="g-cine-location-cut" />}
  </div>;
}
