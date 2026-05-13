import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone } from "lucide-react";
import mansourReadingImg from "@/assets/photos/mansour-reading-email.webp";
import mansourPhoneImg from "@/assets/photos/mansour-picking-phone.webp";

interface MansourReceivesEmailScreenProps {
  onComplete: () => void;
}

export const MansourReceivesEmailScreen = ({ onComplete }: MansourReceivesEmailScreenProps) => {
  const [phase, setPhase] = useState<"reading" | "phoning">("reading");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("phoning"), 3500);
    const t2 = setTimeout(() => onComplete(), 6500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.div
          key={phase}
          className="absolute inset-0"
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0 }}
        >
          <img
            src={phase === "reading" ? mansourReadingImg : mansourPhoneImg}
            alt={phase === "reading" ? "Mansour reading email in his office" : "Mansour picking up the phone"}
            className="w-full h-full object-cover animate-ken-burns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-background/60" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <motion.p
          className="text-muted-foreground text-xs tracking-widest mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          🏢 في مكتب Prism Consulting…
        </motion.p>

        <AnimatePresence mode="wait">
          {phase === "reading" && (
            <motion.div
              key="reading"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/40 text-primary text-sm font-bold"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Mail className="w-4 h-4" />
                إيميل جديد من المحلل
              </motion.div>
              <h2 className="text-foreground text-lg font-bold" dir="rtl">
                أستاذ منصور بيقرأ التقرير…
              </h2>
            </motion.div>
          )}

          {phase === "phoning" && (
            <motion.div
              key="phoning"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-sm font-bold"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              >
                <Phone className="w-4 h-4" />
                بيمسك التليفون…
              </motion.div>
              <h2 className="text-foreground text-lg font-bold" dir="rtl">
                هيرن عليك حالاً
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
