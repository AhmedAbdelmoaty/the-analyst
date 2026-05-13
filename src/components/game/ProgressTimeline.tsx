import { motion } from "framer-motion";

type Screen =
  | "company-briefing"
  | "travel"
  | "arrival"
  | "inquiry"
  | "reflection"
  | "framing"
  | "email-send"
  | "mansour-receives"
  | "incoming-call"
  | "phone-call"
  | "result";

const STAGES: { key: Screen; icon: string; label: string }[] = [
  { key: "company-briefing", icon: "🏢", label: "المكتب" },
  { key: "travel", icon: "🚗", label: "السفر" },
  { key: "arrival", icon: "🏪", label: "الوصول" },
  { key: "inquiry", icon: "❓", label: "الأسئلة" },
  { key: "reflection", icon: "🧠", label: "التأمل" },
  { key: "framing", icon: "📋", label: "التأطير" },
  { key: "email-send", icon: "📧", label: "الإيميل" },
  { key: "mansour-receives", icon: "📩", label: "الاستلام" },
  { key: "incoming-call", icon: "📞", label: "المكالمة" },
  { key: "phone-call", icon: "🗣️", label: "التقييم" },
  { key: "result", icon: "⭐", label: "النتيجة" },
];

interface ProgressTimelineProps {
  currentScreen: string;
}

export const ProgressTimeline = ({ currentScreen }: ProgressTimelineProps) => {
  const currentIdx = STAGES.findIndex((s) => s.key === currentScreen);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-40 px-2 py-1.5 bg-white/90 border-b border-black/10 text-[#171717] shadow-md shadow-black/10 backdrop-blur-md"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center justify-center gap-0.5 max-w-xl mx-auto">
        {STAGES.map((stage, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;

          return (
            <div key={stage.key} className="flex items-center">
              <motion.div
                className={`flex flex-col items-center px-1 ${isFuture ? "opacity-35" : ""}`}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={isCurrent ? { duration: 2, repeat: Infinity } : {}}
              >
                <span className={`text-xs ${isCurrent ? "text-base text-primary" : ""}`}>
                  {isPast ? "✓" : stage.icon}
                </span>
              </motion.div>
              {i < STAGES.length - 1 && (
                <div
                  className={`w-3 h-px mx-0.5 ${
                    isPast ? "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.35)]" : "bg-black/15"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
