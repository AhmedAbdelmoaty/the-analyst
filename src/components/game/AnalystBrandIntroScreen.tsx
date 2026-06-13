import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import promoImage from "@/assets/brand/the-analyst-game.webp";
import analystMark from "@/assets/brand/the-analyst-mark.png";

interface AnalystBrandIntroScreenProps {
  onComplete: () => void;
}

export const AnalystBrandIntroScreen = ({ onComplete }: AnalystBrandIntroScreenProps) => {
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const handleStart = () => {
    if (exiting) return;
    setExiting(true);
    exitTimerRef.current = window.setTimeout(onComplete, 650);
  };

  return (
    <div className="relative h-[100dvh] min-h-screen overflow-hidden bg-black text-white">
      <motion.img
        src={promoImage}
        alt="The Analyst Game"
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
        initial={{ opacity: 0, scale: 1.035, x: 0, y: 0 }}
        animate={{
          opacity: exiting ? 0.82 : 1,
          scale: exiting ? 1.14 : 1.07,
          x: exiting ? 0 : [0, -8, 0],
          y: exiting ? -8 : [0, -5, 0],
        }}
        transition={
          exiting
            ? { duration: 0.65, ease: [0.16, 1, 0.3, 1] }
            : {
                opacity: { duration: 0.55, ease: "easeOut" },
                scale: { duration: 18, ease: "easeOut" },
                x: { duration: 12, repeat: Infinity, ease: "easeInOut" },
                y: { duration: 14, repeat: Infinity, ease: "easeInOut" },
              }
        }
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08)_0%,rgba(0,0,0,.08)_52%,rgba(0,0,0,.54)_100%)]" />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(166,30,37,.34),transparent_34%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0.72 : 0.46 }}
        transition={{ duration: 0.45 }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 1 : 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-[58vw] max-w-[760px] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-full bg-gradient-to-r from-transparent via-[#A61E25] to-transparent shadow-[0_0_36px_rgba(166,30,37,.7)]"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: exiting ? [0, 1, 0] : 0, scaleX: exiting ? [0, 1, 1.18] : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />

      {/* Brand mark — subtle top-left corner badge */}
      <motion.img
        src={analystMark}
        alt="The Analyst"
        className="pointer-events-none absolute left-5 top-5 z-10 h-10 w-auto opacity-90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:left-7 sm:top-7 sm:h-12"
        draggable={false}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: exiting ? 0 : 0.9, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
      />


      <div className="relative z-10 flex h-full items-end justify-center px-5 pb-[clamp(2rem,8vh,5rem)]">
        <motion.button
          type="button"
          onClick={handleStart}
          disabled={exiting}
          className="rounded-xl border border-[#A61E25]/70 bg-[#A61E25] px-10 py-3.5 text-base font-bold text-white shadow-[0_18px_42px_rgba(166,30,37,.42)] outline-none transition-colors hover:bg-[#8F1820] focus-visible:ring-2 focus-visible:ring-white/85 disabled:cursor-default sm:px-12 sm:py-4 sm:text-lg"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: exiting ? 0 : 1, y: exiting ? 18 : 0 }}
          transition={{ delay: exiting ? 0 : 0.55, duration: 0.35, ease: "easeOut" }}
          whileHover={!exiting ? { scale: 1.035, y: -2 } : undefined}
          whileTap={!exiting ? { scale: 0.97 } : undefined}
          dir="rtl"
        >
          ابدأ الآن
        </motion.button>
      </div>
    </div>
  );
};
