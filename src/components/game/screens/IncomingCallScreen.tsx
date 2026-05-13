import { motion } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/hooks/useSoundEffects";
import { useSceneAmbience } from "@/hooks/useSceneAudio";
import analystMaleImg from "@/assets/photos/analyst-relaxing-male.webp";
import analystFemaleImg from "@/assets/photos/analyst-relaxing-female.webp";
import mansourAvatar from "@/assets/photos/mansour-avatar-circle.webp";

interface IncomingCallScreenProps {
  onAnswer: () => void;
}

export const IncomingCallScreen = ({ onAnswer }: IncomingCallScreenProps) => {
  const { profile } = useAuth();
  const { playSound } = useSound();

  const g = (profile?.gender || "male") as "male" | "female";
  const bg = g === "female" ? analystFemaleImg : analystMaleImg;

  // Phone ringtone loops while this screen is shown; stops on unmount automatically.
  useSceneAmbience("phone_ringtone");

  const handleAnswer = () => {
    try { playSound("click"); } catch { /* noop */ }
    onAnswer();
  };


  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4 }}
      >
        <img src={bg} alt="Analyst relaxing" className="w-full h-full object-cover animate-ken-burns" />
        <div className="absolute inset-0 bg-black/65" />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Phone mockup */}
        <motion.div
          className="w-full max-w-xs rounded-[2.5rem] border-4 border-foreground/20 bg-gradient-to-b from-slate-900 to-black shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 60, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 14 }}
        >
          <div className="px-6 pt-8 pb-6 text-center">
            <p className="text-white/60 text-xs tracking-widest mb-6">مكالمة واردة</p>

            <motion.div
              className="relative w-28 h-28 mx-auto mb-4"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping" />
              <img
                src={mansourAvatar}
                alt="أ. منصور"
                className="relative w-28 h-28 rounded-full object-cover border-4 border-emerald-500/60"
              />
            </motion.div>

            <h3 className="text-white text-xl font-bold" dir="rtl">أ. أحمد منصور</h3>
            <p className="text-white/50 text-xs mt-1">Prism Consulting</p>

            <motion.div
              className="mt-3 text-emerald-400 text-xs flex items-center justify-center gap-1.5"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Phone className="w-3 h-3" />
              <span>📞 بيرن…</span>
            </motion.div>
          </div>

          <div className="flex items-center justify-around px-6 py-6 bg-black/40">
            <motion.button
              className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg cursor-not-allowed opacity-50"
              disabled
              title="مينفعش ترفض مكالمة من المدير 😅"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </motion.button>

            <motion.button
              onClick={handleAnswer}
              className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ scale: { duration: 1, repeat: Infinity } }}
            >
              <Phone className="w-6 h-6 text-white" />
            </motion.button>
          </div>
        </motion.div>

        <motion.p
          className="text-white/70 text-xs mt-6"
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          اضغط على الزرار الأخضر للرد
        </motion.p>
      </div>
    </div>
  );
};
