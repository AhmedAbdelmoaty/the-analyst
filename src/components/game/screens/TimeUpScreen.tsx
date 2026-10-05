import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import hallway from "@/assets/scenes/prism-hallway.webp";

interface TimeUpScreenProps {
  onRetry: () => void;
  onBackToStart: () => void;
}

export const TimeUpScreen = ({ onRetry, onBackToStart }: TimeUpScreenProps) => (
  <div className="relative min-h-[100dvh] overflow-hidden bg-background">
    <img src={hallway} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
    <div className="absolute inset-0 bg-game-charcoal/55 backdrop-blur-[2px]" />
    <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-5 py-10">
      <motion.div
        dir="rtl"
        className="w-full max-w-sm rounded-xl border border-game-line bg-game-paper px-6 pb-6 pt-8 text-center shadow-2xl shadow-black/30 sm:px-8"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
          <Clock className="h-7 w-7 text-primary" strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-game-ink">انتهى الوقت</h1>
        <p className="mt-2 text-sm leading-relaxed text-game-muted">
          لم يُرسل التقرير خلال المهلة المحددة. حاول مجددًا.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            إعادة المحاولة
          </button>
          <button
            type="button"
            onClick={onBackToStart}
            className="w-full rounded-md border border-game-line bg-game-paper px-5 py-3 text-sm font-bold text-game-ink transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            العودة إلى البداية
          </button>
        </div>
      </motion.div>
    </div>
  </div>
);
