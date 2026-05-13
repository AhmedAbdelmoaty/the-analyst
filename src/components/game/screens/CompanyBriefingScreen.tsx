import { useEffect, useState } from "react";
import { useSound } from "@/hooks/useSoundEffects";
import { useSceneOneShot, playSceneOneShot } from "@/hooks/useSceneAudio";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedDialogue } from "../EnhancedDialogue";
import { ChartNoAxesColumnIncreasing, DoorOpen } from "lucide-react";
import analystImg from "@/assets/characters/analyst.webp";
import saraImg from "@/assets/characters/sara.webp";
import prismBuildingImg from "@/assets/scenes/prism-building-exterior.webp";
import prismHallwayImg from "@/assets/scenes/prism-hallway.webp";
import prismKnockMaleImg from "@/assets/scenes/prism-knock-male.webp";
import prismKnockFemaleImg from "@/assets/scenes/prism-knock-female.webp";
import mansourWelcomeMaleImg from "@/assets/scenes/mansour-office-welcome-male.webp";
import mansourWelcomeFemaleImg from "@/assets/scenes/mansour-office-welcome-female.webp";
import mansourSeatedMaleImg from "@/assets/scenes/mansour-office-seated-male.webp";
import mansourSeatedFemaleImg from "@/assets/scenes/mansour-office-seated-female.webp";
import { MANSOUR_INTRO_DIALOGUES } from "@/data/pf-case";
import { applyGenderToLine } from "@/lib/voiceover/genderedDialogue";

interface CompanyBriefingScreenProps {
  onComplete: () => void;
  isReviewMode?: boolean;
}

type EnhancedDialogueMood = "neutral" | "happy" | "nervous" | "angry" | "suspicious";

type BriefingPhase = "exterior" | "hallway" | "door-knock" | "dialogue" | "transition";

const mapMood = (mood?: string): EnhancedDialogueMood => {
  switch (mood) {
    case "happy":
      return "happy";
    case "concerned":
      return "nervous";
    case "serious":
      return "neutral";
    case "confident":
      return "neutral";
    case "impressed":
      return "happy";
    case "disappointed":
      return "angry";
    case "uncertain":
      return "suspicious";
    default:
      return "neutral";
  }
};

export const CompanyBriefingScreen = ({
  onComplete,
  isReviewMode = false,
}: CompanyBriefingScreenProps) => {
  const { profile } = useAuth();
  const name = profile?.display_name || "محلل";
  const g = (profile?.gender || "male") as "male" | "female";
  const { playSound } = useSound();

  const [phase, setPhase] = useState<BriefingPhase>(isReviewMode ? "dialogue" : "exterior");

  // Hallway footsteps — one-shot, plays once on entering hallway, stops on leave.
  useSceneOneShot("hallway_footsteps", phase === "hallway");

  const avatarImgEarly = g === "female" ? saraImg : analystImg;
  const knockImgEarly = g === "female" ? prismKnockFemaleImg : prismKnockMaleImg;
  const welcomeImgEarly = g === "female" ? mansourWelcomeFemaleImg : mansourWelcomeMaleImg;
  const seatedImgEarly = g === "female" ? mansourSeatedFemaleImg : mansourSeatedMaleImg;

  // Preload next phase images for instant transitions
  useEffect(() => {
    const preload = (src: string) => { const i = new Image(); i.src = src; };
    if (phase === "exterior") preload(prismHallwayImg);
    if (phase === "hallway") preload(knockImgEarly);
    if (phase === "door-knock") preload(welcomeImgEarly);
    if (phase === "transition") preload(seatedImgEarly);
  }, [phase, knockImgEarly, welcomeImgEarly, seatedImgEarly]);

  useEffect(() => {
    if (isReviewMode) return;
    if (phase === "exterior") {
      const timer = setTimeout(() => setPhase("hallway"), 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, isReviewMode]);

  const dialogues = MANSOUR_INTRO_DIALOGUES.map((line) => {
    const adjusted = applyGenderToLine(line, g);
    return {
      characterId: adjusted.characterId,
      text: adjusted.text,
      mood: mapMood(adjusted.mood),
      audioSrc: adjusted.audioSrc,
    };
  });

  const handleDialogueComplete = () => {
    if (isReviewMode) {
      onComplete();
      return;
    }
    setPhase("transition");
  };

  const avatarImg = g === "female" ? saraImg : analystImg;
  const knockImg = g === "female" ? prismKnockFemaleImg : prismKnockMaleImg;
  const welcomeImg = g === "female" ? mansourWelcomeFemaleImg : mansourWelcomeMaleImg;
  const seatedImg = g === "female" ? mansourSeatedFemaleImg : mansourSeatedMaleImg;

  if (phase === "exterior") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <motion.div className="absolute inset-0" initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 2 }}>
          <img src={prismBuildingImg} alt="Prism Consulting" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </motion.div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-3">
            <p className="text-muted-foreground text-sm tracking-[0.35em] uppercase">Consulting Tower</p>
            <h1 className="text-accent font-bold text-3xl">Prism Consulting</h1>
            <p className="text-foreground/80 text-sm" dir="rtl">رحلتك بتبدأ من هنا</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "hallway") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <motion.div className="absolute inset-0" initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.6, ease: "easeOut" }}>
          <img src={prismHallwayImg} alt="Prism hallway" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </motion.div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8 }} className="space-y-3">
            <p className="text-muted-foreground text-sm tracking-widest uppercase">Floor 12</p>
            <h1 className="text-accent font-bold text-2xl">Prism Consulting</h1>
            <p className="text-muted-foreground text-sm" dir="rtl">مكتب أ. منصور</p>
          </motion.div>

          <motion.button
            onClick={() => {
              setPhase("door-knock");
              setTimeout(() => { try { playSceneOneShot("door_knock"); } catch {} }, 150);
            }}
            className="mt-10 px-8 py-3 rounded-xl bg-card/65 border border-border text-foreground font-bold hover:bg-card/80 transition-all flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <DoorOpen className="w-5 h-5" />
            اطرق باب المكتب
          </motion.button>
        </div>
      </div>
    );
  }

  if (phase === "door-knock") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <img src={knockImg} alt="Knocking on Mansour's office" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
        </motion.div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
          <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.button
              onClick={() => {
                try {
                  playSound("door");
                } catch {}
                setPhase("dialogue");
              }}
              className="mt-4 px-8 py-3 rounded-xl bg-card/65 border border-border text-foreground font-bold hover:bg-card/80 transition-all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              ادخل المكتب
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "transition") {
    return (
      <div className="min-h-screen bg-background relative">
        <div className="absolute inset-0">
          <img src={welcomeImg} alt="Mansour welcomes the analyst" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <motion.div className="max-w-md w-full text-center space-y-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <motion.div className="mx-auto w-28 h-28 rounded-full overflow-hidden border-4 border-accent glow-accent" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", damping: 12 }}>
              <img src={avatarImg} alt={name} className="w-full h-full object-cover" />
            </motion.div>

            <motion.div className="imp-panel p-6 rounded-xl space-y-4" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <ChartNoAxesColumnIncreasing className="w-8 h-8 text-primary mx-auto" />
              <p className="text-[#171717] text-lg font-bold leading-relaxed" dir="rtl">
                دورك كمحلل بيانات تساعد العميل على اتخاذ القرار الصحيح
              </p>
            </motion.div>

            <motion.button
              onClick={onComplete}
              className="imp-action relative px-8 py-4 rounded-xl text-lg font-bold overflow-hidden group w-full"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" animate={{ x: ["-200%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }} />
              <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                يلا نروح للعميل
              </span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <motion.div className="absolute inset-0" initial={{ scale: 1.04, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, ease: "easeOut" }}>
        <img src={seatedImg} alt="Meeting with Mansour" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
      </motion.div>

      <motion.div className="relative z-10 pt-12 pb-4 text-center" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted-foreground text-sm">🏢 مكتب الشركة</p>
        <h2 className="text-accent font-bold text-lg">Prism Consulting</h2>
        <p className="text-muted-foreground text-xs">Executive Briefing</p>
      </motion.div>

      <EnhancedDialogue
        dialogues={dialogues}
        isActive={phase === "dialogue"}
        onComplete={handleDialogueComplete}
        playerName={name}
        playerGender={g}
      />
    </div>
  );
};
