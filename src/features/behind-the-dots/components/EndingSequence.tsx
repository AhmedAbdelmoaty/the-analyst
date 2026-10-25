import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { Ending } from "../engine/gameState";
import { gameAudio } from "../engine/sound";

type Pose = "idle" | "enter" | "stumble" | "celebrate" | "taunt" | "run" | "happy" | "worried";
const file = (actor: "dotty" | "glitch" | "leila", pose: Pose, runFrame = 1) => `/assets/behind-dots/v6/${actor}_${pose === "run" ? `run_${String(runFrame).padStart(2, "0")}` : pose}.png`;

export function EndingSequence({ ending, paused, onComplete }: { ending: Ending; paused: boolean; onComplete: () => void }) {
  const root = useRef<HTMLElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [poses, setPoses] = useState({ dotty: ending === "glitch" ? "stumble" : "run", glitch: "run", leila: "worried" } as Record<"dotty" | "glitch" | "leila", Pose>);
  const [runFrames, setRunFrames] = useState({ dotty: 1, glitch: 1 });

  useLayoutEffect(() => {
    if (!root.current) return;
    const scope = gsap.context(() => {
      const dotty = root.current!.querySelector(".btd-ending-dotty");
      const glitch = root.current!.querySelector(".btd-ending-glitch");
      const leila = root.current!.querySelector(".btd-ending-leila");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const reduced = gsap.timeline({ onComplete });
        timeline.current = reduced;
        reduced.call(() => {
          setPoses(ending === "perfect"
            ? { dotty: "celebrate", glitch: "stumble", leila: "happy" }
            : ending === "saved"
              ? { dotty: "celebrate", glitch: "taunt", leila: "happy" }
              : { dotty: "idle", glitch: "taunt", leila: "worried" });
          gameAudio.play(ending === "perfect" ? "perfectWin" : ending === "saved" ? "savedWin" : "defeat");
        }, [], .12).to(root.current, { opacity: 1, duration: .35 }).to({}, { duration: .35 });
        return;
      }
      const tl = gsap.timeline({ onComplete });
      timeline.current = tl;
      tl.fromTo(".btd-ending-backdrop", { scale: 1.12, filter: "brightness(.65)" }, { scale: 1, filter: "brightness(1)", duration: .8, ease: "power2.out" });
      if (ending === "perfect") {
        tl.call(() => gameAudio.play("perfectWin"), [], .35)
          .call(() => setRunFrames({ dotty: 1, glitch: 2 }), [], .06)
          .call(() => setRunFrames({ dotty: 2, glitch: 3 }), [], .18)
          .call(() => setRunFrames({ dotty: 3, glitch: 4 }), [], .3)
          .call(() => setRunFrames({ dotty: 4, glitch: 1 }), [], .42)
          .to(dotty, { x: "-24vw", y: -120, rotation: -8, duration: .85, ease: "power2.out" }, .45)
          .call(() => gameAudio.play("jumpLand"), [], 1.32)
          .call(() => setPoses((p) => ({ ...p, dotty: "celebrate", glitch: "stumble" })), [], 1.45)
          .call(() => gameAudio.play("stumble"), [], 1.45)
          .to(glitch, { x: "-22vw", rotation: 72, y: 105, duration: .8, ease: "back.in(1.6)" }, 1.45)
          .to(dotty, { y: -28, rotation: 8, duration: .35, yoyo: true, repeat: 3, ease: "sine.inOut" }, 1.6)
          .call(() => setPoses((p) => ({ ...p, leila: "happy" })), [], 2.05)
          .call(() => gameAudio.play("cartBell"), [], 2.15)
          .fromTo(leila, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: .55 }, 2.05)
          .to(".btd-ending-confetti", { opacity: 1, scale: 1, duration: .5 }, 2.2)
          .to({}, { duration: 2.2 });
      } else if (ending === "saved") {
        tl.call(() => gameAudio.play("savedWin"), [], .35)
          .call(() => setRunFrames({ dotty: 1, glitch: 2 }), [], .06)
          .call(() => setRunFrames({ dotty: 2, glitch: 3 }), [], .18)
          .call(() => setRunFrames({ dotty: 3, glitch: 4 }), [], .3)
          .call(() => setRunFrames({ dotty: 4, glitch: 1 }), [], .42)
          .to(dotty, { x: "-20vw", y: -76, duration: .75, ease: "power2.out" }, .45)
          .call(() => gameAudio.play("jumpLand"), [], 1.22)
          .call(() => setPoses((p) => ({ ...p, dotty: "celebrate", glitch: "taunt", leila: "happy" })), [], 1.25)
          .to(glitch, { x: "-8vw", rotation: -10, duration: .45 }, 1.3)
          .call(() => gameAudio.play("stumble"), [], 1.3)
          .to(dotty, { y: -18, duration: .35, yoyo: true, repeat: 2 }, 1.45)
          .to(leila, { opacity: 1, duration: .35 }, 1.6)
          .call(() => gameAudio.play("cartBell"), [], 1.7)
          .to(".btd-ending-confetti", { opacity: .55, scale: .8, duration: .4 }, 1.7)
          .to({}, { duration: 2.1 });
      } else {
        tl.call(() => gameAudio.play("defeat"), [], .3)
          .call(() => setRunFrames({ dotty: 1, glitch: 2 }), [], .32)
          .call(() => setRunFrames({ dotty: 2, glitch: 3 }), [], .44)
          .call(() => setRunFrames({ dotty: 3, glitch: 4 }), [], .56)
          .call(() => setRunFrames({ dotty: 4, glitch: 1 }), [], .68)
          .to(glitch, { x: "-18vw", duration: .6, ease: "power2.in" }, .4)
          .to(dotty, { x: "-10vw", y: 35, rotation: 22, duration: .45 }, .75)
          .call(() => gameAudio.play("jumpLand"), [], .85)
          .call(() => setPoses((p) => ({ ...p, dotty: "stumble", glitch: "taunt" })), [], 1.15)
          .call(() => gameAudio.play("stumble"), [], 1.15)
          .to(glitch, { scale: 1.1, duration: .25, yoyo: true, repeat: 1 }, 1.25)
          .to(dotty, { x: "-4vw", y: 0, rotation: 0, duration: .45 }, 1.7)
          .call(() => setPoses((p) => ({ ...p, dotty: "idle", leila: "worried" })), [], 2.1)
          .to(leila, { opacity: 1, duration: .35 }, 2.15)
          .to({}, { duration: 2 });
      }
    }, root);
    return () => { timeline.current?.kill(); timeline.current = null; scope.revert(); };
  }, [ending, onComplete]);

  useLayoutEffect(() => { if (paused) timeline.current?.pause(); else timeline.current?.resume(); }, [paused]);

  return <section ref={root} className={`btd-ending-sequence ending-${ending}`} aria-label="مشهد النهاية">
    <img className="btd-ending-backdrop" src="/assets/behind-dots/market-v5.png" alt="" />
    <div className="btd-ending-confetti" aria-hidden="true">✦ ✧ ✦ ✶ ✦ ✧ ✦</div>
    <img className="btd-ending-actor btd-ending-glitch" src={file("glitch", poses.glitch, runFrames.glitch)} alt="" />
    <img className="btd-ending-actor btd-ending-dotty" src={file("dotty", poses.dotty, runFrames.dotty)} alt="" />
    <img className="btd-ending-actor btd-ending-leila" src={file("leila", poses.leila)} alt="" />
    <button type="button" className="btd-ending-skip" onClick={onComplete}>تخطّي المشهد ←</button>
  </section>;
}
