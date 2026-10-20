import { useEffect, useRef, useState } from "react";

export type Mood = "happy" | "scared" | "cheer";

export function Dotty({ size = 44, mood = "happy" }: { size?: number; mood?: Mood }) {
  const motion = mood === "scared" ? "animate-shiver" : mood === "cheer" ? "animate-hop" : "animate-bob";
  return (
    <div aria-hidden className={`shrink-0 ${motion}`} style={{ width: size, height: size }}>
      <img src="/assets/behind-dots/dotty.png" alt="" width={size} height={size} className="h-full w-full object-contain" />
    </div>
  );
}

export function Glitch({ size = 56, chomp = false }: { size?: number; chomp?: boolean }) {
  return (
    <div aria-hidden className={chomp ? "animate-lunge" : "animate-scuttle"} style={{ width: size, height: size }}>
      <img src="/assets/behind-dots/glitch.png" alt="" width={size} height={size} className="h-full w-full object-contain" />
    </div>
  );
}

/** Glitch descends toward Dotty over `seconds`; reaching her calls onTimeout once. */
export function ChaseTimer({ seconds, paused, onTimeout }: { seconds: number; paused: boolean; onTimeout: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const fired = useRef(false);
  const cb = useRef(onTimeout);
  cb.current = onTimeout;

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setElapsed((e) => {
        const n = Math.min(seconds, e + dt);
        if (n >= seconds && !fired.current) {
          fired.current = true;
          setTimeout(() => cb.current(), 500);
        }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, seconds]);

  const p = elapsed / seconds;
  const danger = p >= 0.75;
  const caught = elapsed >= seconds;
  const remaining = Math.max(0, Math.ceil(seconds - elapsed));

  return (
    <aside
      className={`chase-rail ${danger ? "chase-rail-danger" : ""}`}
      style={{ right: "max(0.5rem, calc((100vw - 44rem) / 2))", bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      aria-label={`فاضل ${remaining} ثانية قبل ما جليتش يوصل لدوتّي`}
      role="timer"
    >
      <div className="chase-clock"><strong>{remaining}</strong><span>ثانية</span></div>
      <div className="chase-whisper">جليتش<br />نازل!</div>
      <div className="chase-lane" dir="ltr">
        <div className="chase-track" />
        <div className="chase-fill" style={{ height: `calc((100% - 3.5rem) * ${p})` }} />
        <div className="chase-monster" style={{ top: `calc(0.75rem + (100% - 3.25rem) * ${p})` }}>
          <Glitch size={64} chomp={caught || danger} />
        </div>
        <div className={`chase-dotty ${caught ? "is-caught" : ""}`}>
          <Dotty size={44} mood={caught || danger ? "scared" : "happy"} />
        </div>
      </div>
    </aside>
  );
}
