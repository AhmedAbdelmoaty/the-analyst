import { useEffect, useState } from "react";
import { TIME_CHALLENGE_DURATION_MS, remainingMs, type TimeChallenge } from "@/lib/pf-time-challenge";

/**
 * Self-contained ticking display; its updates never re-render game screens.
 * Time is derived from the persisted active-play clock, so a paused round shows a frozen value.
 */
export const TimeChallengeBar = ({ challenge, belowTimeline }: { challenge: TimeChallenge; belowTimeline: boolean }) => {
  const [now, setNow] = useState(() => Date.now());
  const running = challenge.runningSince != null;

  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running, challenge.runningSince, challenge.remainingMs]);

  const remaining = remainingMs(challenge, now);
  const secs = Math.ceil(remaining / 1000);
  const label = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const fraction = Math.min(1, remaining / TIME_CHALLENGE_DURATION_MS);
  const level = secs <= 30 ? "critical" : secs <= 60 ? "warning" : "normal";

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[58] -translate-x-1/2"
      style={{ top: `calc(env(safe-area-inset-top, 0px) + ${belowTimeline ? "2.5rem" : "0.95rem"})` }}
      role="timer"
      aria-label={`الوقت المتبقي ${label}`}
      data-testid="time-challenge"
    >
      <div className={`time-challenge ${level} w-[5.25rem] rounded-md border bg-game-paper px-2 pb-1 pt-0.5 text-center shadow-md shadow-black/15 sm:w-32 sm:px-3 sm:pb-1.5 sm:pt-1`}>
        <p className="hidden text-[10px] font-semibold leading-tight text-game-muted sm:block" dir="rtl">الوقت المتبقي</p>
        <p
          dir="ltr"
          className={`font-mono text-sm font-bold leading-tight tabular-nums sm:text-base ${level === "normal" ? "text-game-ink" : "text-primary"}`}
        >
          {label}
        </p>
        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-game-line sm:mt-1" dir="ltr">
          <div
            className="time-challenge-fill h-full origin-left rounded-full bg-primary"
            style={{ transform: `scaleX(${fraction})` }}
          />
        </div>
      </div>
    </div>
  );
};
