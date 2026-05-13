import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import { usePFGame } from "@/contexts/PFGameContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/hooks/useSoundEffects";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { CaseOutcome } from "@/lib/pf-case/case-tree";
import femaleStrongMascot from "@/assets/results/result-mascot-female-strong.webp";
import femaleWeakMascot from "@/assets/results/result-mascot-female-weak.webp";
import maleStrongMascot from "@/assets/results/result-mascot-male-strong.webp";
import maleWeakMascot from "@/assets/results/result-mascot-male-weak.webp";
import impLogo from "@/assets/brand/imp-logo.webp";

interface ResultScreenProps {
  onNavigate: (screen: string) => void;
}

const RESULT_VIEW = {
  strong: {
    badge: "🎉 أداء ممتاز",
    title: { male: "برافو! سألت صح", female: "برافو! سألتي صح" },
    feedback: {
      male: "وصلت للصورة قبل ما تستعجل الحل. ده Problem Framing قوي.",
      female: "وصلتي للصورة قبل ما تستعجلي الحل. ده Problem Framing قوي.",
    },
    mascot: { male: maleStrongMascot, female: femaleStrongMascot },
    stars: 3,
    sound: "fanfare",
    page: "bg-[radial-gradient(circle_at_50%_30%,rgba(166,30,37,.18),transparent_42%),linear-gradient(135deg,#f7f2e8_0%,#fff_54%,#f4e2e3_100%)]",
    stage: "border-[#A61E25]/80 bg-white/95 shadow-[#A61E25]/25",
    titleColor: "text-[#151515]",
    badgeStyle: "border-[#A61E25]/35 bg-white/80 text-[#A61E25]",
    starOn: "bg-[#A61E25] text-white shadow-[#A61E25]/35",
    starOff: "bg-white/60 text-[#b8aa9c]",
    button: "bg-[#A61E25] text-white shadow-[#A61E25]/35 hover:bg-[#8f1820]",
    chipOn: "bg-[#A61E25]/10 text-[#A61E25] border-[#A61E25]/35",
    chipOff: "bg-white/60 text-[#6f635c] border-white/70",
    confetti: ["#A61E25", "#ffffff", "#111111", "#d7c28a", "#7d141a"],
  },
  weak: {
    badge: "💡 جرّب تاني",
    title: { male: "محتاج تسأل أذكى", female: "محتاجة تسألي أذكى" },
    feedback: {
      male: "ابدأ بأسئلة تفتح الصورة بدل ما تروح للحل بسرعة.",
      female: "ابدأي بأسئلة تفتح الصورة بدل ما تروحي للحل بسرعة.",
    },
    mascot: { male: maleWeakMascot, female: femaleWeakMascot },
    stars: 1,
    sound: "sparkle",
    page: "bg-[radial-gradient(circle_at_50%_30%,rgba(166,30,37,.13),transparent_42%),linear-gradient(135deg,#f7f2e8_0%,#fff_58%,#eadedf_100%)]",
    stage: "border-[#111111]/80 bg-white/95 shadow-[#A61E25]/20",
    titleColor: "text-[#A61E25]",
    badgeStyle: "border-[#111111]/15 bg-[#111111]/90 text-white",
    starOn: "bg-[#A61E25] text-white shadow-[#A61E25]/25",
    starOff: "bg-[#f1eadf] text-[#b9ada1]",
    button: "bg-[#111111] text-white shadow-[#111111]/25 hover:bg-[#A61E25]",
    chipOn: "bg-[#A61E25]/10 text-[#A61E25] border-[#A61E25]/35",
    chipOff: "bg-[#f5efe7] text-[#786b64] border-[#dfd2c6]",
    confetti: ["#A61E25", "#111111", "#d7c28a", "#ffffff"],
  },
} as const;

const chips = {
  male: ["🎯 اسأل صح", "🧩 افهم الصورة", "⚡ قرر بثقة"],
  female: ["🎯 اسألي صح", "🧩 افهمي الصورة", "⚡ قرري بثقة"],
} as const;

const helperCopy = {
  male: "كل محاولة بتقربك",
  female: "كل محاولة بتقربك",
} as const;

const replayCopy = {
  male: "العب مرة أخرى",
  female: "العبي مرة أخرى",
} as const;

const confettiPieces = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${(index * 23) % 98}%`,
  delay: (index % 10) * 0.09,
  duration: 2.8 + (index % 5) * 0.25,
  rotate: (index * 47) % 180,
  size: index % 3 === 0 ? "h-3 w-2" : index % 3 === 1 ? "h-2 w-2" : "h-2.5 w-1.5",
}));

export const ResultScreen = ({ onNavigate }: ResultScreenProps) => {
  const { state } = usePFGame();
  const { profile } = useAuth();
  const { playSound } = useSound();

  const playerName = profile?.first_name || profile?.display_name || "محلل";
  const playerGender = (profile?.gender || "male") as "male" | "female";
  const outcome = (state.outcome || "weak") as CaseOutcome;
  const view = RESULT_VIEW[outcome];
  const mascot = view.mascot[playerGender];
  const title = view.title[playerGender];
  const feedback = view.feedback[playerGender];
  const genderedChips = chips[playerGender];

  // Record completion once per game session
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current) return;
    if (!profile?.first_name || !profile?.last_name) return;
    const key = "pf-game-submitted";
    if (localStorage.getItem(key)) return;
    recordedRef.current = true;
    localStorage.setItem(key, "1");

    const fullSpine =
      !state.trackEntered &&
      state.history.length >= 5 &&
      state.history.every((h) => h.choice === "correct");
    const qualified = fullSpine && (state.framingCorrectCount ?? 0) === 2;
    const startedAt = state.gameStartedAt ?? Date.now();
    const duration_ms = Date.now() - startedAt;

    supabase
      .from("completed_players")
      .insert({
        first_name: profile.first_name,
        last_name: profile.last_name,
        qualified,
        outcome: state.outcome,
        framing_correct: state.framingCorrectCount,
        duration_ms,
        started_at: new Date(startedAt).toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          localStorage.removeItem(key);
          console.warn("Failed to record completion:", error.message);
        }
      });
  }, [profile?.first_name, profile?.last_name, state]);

  const soundPlayedRef = useRef(false);
  useEffect(() => {
    if (soundPlayedRef.current) return;
    soundPlayedRef.current = true;
    playSound(view.sound);
    if (outcome === "strong") {
      const timer = window.setTimeout(() => playSound("confetti"), 460);
      return () => window.clearTimeout(timer);
    }
  }, [outcome, playSound, view.sound]);

  const litChipCount = useMemo(() => {
    if (outcome === "strong") return 3;
    return 1;
  }, [outcome]);

  return (
    <div className={cn("relative h-[100dvh] overflow-hidden text-[#172033]", view.page)} dir="rtl">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,rgba(166,30,37,.28)_1px,transparent_1px),linear-gradient(rgba(17,17,17,.22)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,.72),rgba(255,255,255,.18)_40%,transparent_68%)]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {outcome !== "weak" &&
          confettiPieces.map((piece) => (
            <motion.span
              key={piece.id}
              className={cn("absolute top-[-8%] rounded-sm", piece.size)}
              style={{
                left: piece.left,
                rotate: `${piece.rotate}deg`,
                backgroundColor: view.confetti[piece.id % view.confetti.length],
              }}
              initial={{ y: "-10vh", opacity: 0, scale: 0.8 }}
              animate={{ y: "112vh", opacity: [0, 1, 1, 0], scale: [0.7, 1, 0.95] }}
              transition={{
                delay: piece.delay,
                duration: piece.duration,
                repeat: outcome === "strong" ? Infinity : 0,
                repeatDelay: 1.6,
                ease: "linear",
              }}
            />
          ))}
      </div>

      <main className="relative z-10 flex h-full items-center justify-center px-3 py-3 sm:px-5 sm:py-4">
        <section
          className={cn(
            "relative grid h-full max-h-[820px] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-4 p-3 shadow-2xl sm:p-5",
            view.stage
          )}
          style={{ borderRadius: "28px" }}
        >
          <img
            src={impLogo}
            alt="IMP"
            className="absolute left-3 top-3 z-10 h-9 w-auto rounded-md bg-white/90 px-2 py-1 shadow-md sm:left-5 sm:top-5 sm:h-11"
          />
          <motion.div
            className={cn(
              "mx-auto inline-flex h-11 items-center gap-2 rounded-2xl border px-5 text-sm font-bold shadow-lg backdrop-blur-sm sm:h-12 sm:text-base",
              view.badgeStyle
            )}
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            dir="rtl"
          >
            <span>{view.badge}</span>
            <span className="h-5 w-px bg-current/20" />
            <span className="text-current/75">يا {playerName}</span>
          </motion.div>

          <div className="grid min-h-0 grid-cols-1 items-center gap-2 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
            <div className="relative flex min-h-0 items-center justify-center">
              <motion.div
                className="absolute bottom-[5%] h-[18%] w-[76%] max-w-[520px] bg-black/10 blur-2xl"
                style={{ borderRadius: "50%" }}
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.45, duration: 0.45 }}
              />
              <motion.img
                src={mascot}
                alt=""
                className="relative z-10 max-h-[min(52vh,520px)] w-auto max-w-[92%] object-contain drop-shadow-[0_28px_38px_rgba(15,23,42,.22)] sm:max-h-[min(60vh,560px)]"
                initial={{ opacity: 0, y: 42, scale: 0.74, rotate: outcome === "weak" ? -4 : 4 }}
                animate={{
                  opacity: 1,
                  y: outcome === "weak" ? 0 : [0, -7, 0],
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  opacity: { delay: 0.15, duration: 0.25 },
                  scale: { delay: 0.15, type: "spring", stiffness: 180, damping: 12 },
                  rotate: { delay: 0.15, duration: 0.42 },
                  y: { delay: 0.8, duration: 2.8, repeat: outcome === "weak" ? 0 : Infinity, ease: "easeInOut" },
                }}
              />
            </div>

            <div className="flex min-h-0 flex-col items-center justify-center text-center">
              <motion.div
                className="mb-2 flex items-center justify-center gap-2 sm:mb-3"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.16, delayChildren: 0.42 } },
                }}
              >
                {[0, 1, 2].map((index) => {
                  const earned = index < view.stars;
                  return (
                    <motion.div
                      key={index}
                      className={cn(
                        "flex h-[clamp(46px,7vw,82px)] w-[clamp(46px,7vw,82px)] items-center justify-center text-[clamp(1.8rem,4.8vw,3.9rem)] font-bold shadow-xl",
                        earned ? view.starOn : view.starOff
                      )}
                      style={{
                        clipPath:
                          "polygon(50% 0%, 61% 34%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 34%)",
                      }}
                      variants={{
                        hidden: { opacity: 0, scale: 0.25, y: 18, rotate: -24 },
                        show: { opacity: 1, scale: 1, y: 0, rotate: 0 },
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 13 }}
                    >
                      ★
                    </motion.div>
                  );
                })}
              </motion.div>

              <motion.h1
                className={cn(
                  "max-w-[560px] text-balance text-[clamp(1.35rem,3.4vw,2.8rem)] font-bold leading-[1.16]",
                  view.titleColor
                )}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72, duration: 0.42 }}
              >
                {title}
              </motion.h1>

              <motion.p
                className="mt-2 max-w-[520px] text-balance text-[clamp(.95rem,1.8vw,1.25rem)] font-bold leading-7 text-[#4b5563] sm:mt-3"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.88, duration: 0.38 }}
              >
                {feedback}
              </motion.p>

              <motion.div
                className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.02, duration: 0.34 }}
              >
                {genderedChips.map((chip, index) => (
                  <span
                    key={chip}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full border px-3 text-xs font-bold shadow-sm sm:h-10 sm:px-4 sm:text-sm",
                      index < litChipCount ? view.chipOn : view.chipOff
                    )}
                  >
                    {chip}
                  </span>
                ))}
              </motion.div>

              {outcome === "weak" && (
                <motion.div
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#A61E25]/10 px-4 py-2 text-sm font-bold text-[#A61E25] shadow-md sm:mt-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: [1, 1.04, 1] }}
                  transition={{
                    opacity: { delay: 1.12, duration: 0.3 },
                    scale: { delay: 1.3, duration: 1.4, repeat: Infinity, ease: "easeInOut" },
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  {helperCopy[playerGender]}
                </motion.div>
              )}
            </div>
          </div>

          <motion.div
            className="mx-auto flex w-full max-w-[360px] justify-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.12, duration: 0.35 }}
          >
            <motion.button
              onClick={() => onNavigate("company-briefing")}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-bold shadow-xl outline-none ring-offset-2 transition-transform focus-visible:ring-2 focus-visible:ring-slate-900 sm:h-14",
                view.button
              )}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <RotateCcw className="h-5 w-5" />
              {replayCopy[playerGender]}
            </motion.button>
          </motion.div>
        </section>
      </main>
    </div>
  );
};
