import { useEffect, useState } from "react";
import { TIME_CHALLENGE_DURATION_MS } from "@/lib/pf-time-challenge";

/** Self-contained ticking display; its per-second updates never re-render game screens. */
export const TimeChallengeBar = ({ deadline }: { deadline: number }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const remaining = Math.max(0, deadline - now);
  const secs = Math.ceil(remaining / 1000);
  const label = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const fraction = Math.min(1, remaining / TIME_CHALLENGE_DURATION_MS);
  const level = secs <= 30 ? "critical" : secs <= 60 ? "warning" : "normal";

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[56] -translate-x-1/2"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.95rem)" }}
      role="timer"
      aria-label={`الوقت المتبقي ${label}`}
    >
      <div className={`time-challenge ${level} w-[5.75rem] rounded-md border bg-game-paper px-2 pb-1.5 pt-1 text-center shadow-md shadow-black/15 sm:w-32 sm:px-3`}>
        <p className="text-[9px] font-semibold leading-tight text-game-muted sm:text-[10px]" dir="rtl">الوقت المتبقي</p>
        <p
          dir="ltr"
          className={`font-mono text-sm font-bold leading-tight tabular-nums sm:text-base ${level === "normal" ? "text-game-ink" : "text-primary"}`}
        >
          {label}
        </p>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-game-line" dir="ltr">
          <div
            className="h-full origin-left rounded-full bg-primary"
            style={{ transform: `scaleX(${fraction})`, transition: "transform 300ms linear" }}
          />
        </div>
      </div>
    </div>
  );
};
