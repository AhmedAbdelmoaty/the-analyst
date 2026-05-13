import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/hooks/useSoundEffects";
import { useSceneAmbience } from "@/hooks/useSceneAudio";
import analystMaleImg from "@/assets/photos/analyst-laptop-evening-male.webp";
import analystFemaleImg from "@/assets/photos/analyst-laptop-evening-female.webp";

interface EmailSendScreenProps {
  onComplete: () => void;
}

export const EmailSendScreen = ({ onComplete }: EmailSendScreenProps) => {
  const { profile } = useAuth();
  const { playSound } = useSound();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const g = (profile?.gender || "male") as "male" | "female";
  const playerName = profile?.display_name || "محلل";
  const bg = g === "female" ? analystFemaleImg : analystMaleImg;

  // Keyboard typing ambience while composing — stops when sent/sending or screen leaves.
  useSceneAmbience(!sent && !sending ? "keyboard_typing" : null);

  const handleSend = () => {
    if (sending || sent) return;
    setSending(true);
    try {
      playSound("whoosh");
    } catch {
      /* noop */
    }
    try {
      playSound("collect");
    } catch {
      /* noop */
    }
    setTimeout(() => {
      setSent(true);
      try {
        playSound("notification");
      } catch {
        /* noop */
      }
      setTimeout(onComplete, 1800);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4 }}
      >
        <img src={bg} alt="Analyst at laptop" className="w-full h-full object-cover animate-ken-burns" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/40" />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-6"
        >
          <p className="text-muted-foreground text-xs tracking-widest">📧 إرسال التقرير</p>
          <h2 className="text-foreground text-lg font-bold mt-2" dir="rtl">
            ابعت التقرير لمديرك المباشر قبل ما تخلص يومك
          </h2>
        </motion.div>

        {/* Email mockup */}
        <motion.div
          className="imp-panel w-full max-w-md overflow-hidden rounded-2xl"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.6, type: "spring", damping: 18 }}
        >
          <div className="imp-panel-header flex items-center gap-2 px-4 py-3">
            <Mail className="w-4 h-4 text-white" />
            <span className="text-xs text-white/80 font-mono">رسالة جديدة</span>
          </div>

          <div className="p-4 space-y-3 text-sm" dir="rtl">
            <div className="flex gap-2 border-b border-border/40 pb-2">
              <span className="text-[#666] w-14 shrink-0">إلى:</span>
              <span className="text-[#171717] font-mono text-xs">ahmed.mansour@prism-consulting.com</span>
            </div>
            <div className="flex gap-2 border-b border-border/40 pb-2">
              <span className="text-[#666] w-14 shrink-0">من:</span>
              <span className="text-[#171717] font-mono text-xs">
                {playerName.toLowerCase().replace(/\s+/g, ".")}@prism-consulting.com
              </span>
            </div>
            <div className="flex gap-2 border-b border-border/40 pb-2">
              <span className="text-[#666] w-14 shrink-0">الموضوع:</span>
              <span className="text-[#171717] font-bold text-xs">تقرير قضية VELARO</span>
            </div>
            <div className="pt-2 text-[#343434] text-xs leading-relaxed">
              <p>أستاذ منصور،</p>
              <p className="mt-2">
                مرفق تقرير قضية VELARO مع تفسير المشكلة كاملاً، نتائج المقابلة مع أستاذ هشام الشريف، والتوصية النهائية.
              </p>
              <p className="mt-2">في انتظار ملاحظاتك.</p>
              <p className="mt-2 text-primary font-bold">📎 VELARO_Framing_Report.pdf</p>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-black/10 bg-[#f7f2e8] flex justify-end">
            <motion.button
              onClick={handleSend}
              disabled={sending || sent}
              className="imp-action flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-60"
              whileHover={!sending && !sent ? { scale: 1.04 } : {}}
              whileTap={!sending && !sent ? { scale: 0.96 } : {}}
            >
              <Send className="w-4 h-4" />
              {sent ? "تم الإرسال ✓" : sending ? "جاري الإرسال…" : "أرسل التقرير"}
            </motion.button>
          </div>
        </motion.div>

        {/* Flying email animation */}
        <AnimatePresence>
          {sending && (
            <motion.div
              className="absolute text-5xl pointer-events-none"
              initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1.2, 0.6], x: 220, y: -200, rotate: 15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
            >
              📧
            </motion.div>
          )}
        </AnimatePresence>

        {sent && (
          <motion.p
            className="mt-6 text-accent text-sm font-bold"
            dir="rtl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ✓ التقرير وصل لمديرك انتظر مكالمة منه…
          </motion.p>
        )}
      </div>
    </div>
  );
};
