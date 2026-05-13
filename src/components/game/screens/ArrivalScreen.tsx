import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, DoorOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/hooks/useSoundEffects";
import { useSceneAmbience, type SceneAudioKey } from "@/hooks/useSceneAudio";
import { EnhancedDialogue } from "../EnhancedDialogue";
import velaroStorefrontImg from "@/assets/scenes/velaro-storefront.webp";
import velaroEnteringMaleImg from "@/assets/scenes/velaro-entering-male.webp";
import velaroEnteringFemaleImg from "@/assets/scenes/velaro-entering-female.webp";
import velaroInteriorWideImg from "@/assets/scenes/velaro-interior-wide.webp";
import hishamGreetingMaleImg from "@/assets/scenes/hisham-greeting-male.webp";
import hishamGreetingFemaleImg from "@/assets/scenes/hisham-greeting-female.webp";
import hishamOfficeSeatedMaleImg from "@/assets/scenes/hisham-office-seated-male.webp";
import hishamOfficeSeatedFemaleImg from "@/assets/scenes/hisham-office-seated-female.webp";
import { HISHAM_GREETING } from "@/data/pf-case";
import { applyGenderToLine } from "@/lib/voiceover/genderedDialogue";

interface ArrivalScreenProps {
  onComplete: () => void;
}

type Phase = "storefront" | "entering" | "interior" | "dialogue";
type DialogueMood = "neutral" | "happy" | "nervous" | "angry" | "suspicious";

const mapMood = (mood?: string): DialogueMood => {
  switch (mood) {
    case "happy": return "happy";
    case "concerned": return "nervous";
    case "impressed": return "happy";
    case "disappointed": return "angry";
    case "uncertain": return "suspicious";
    default: return "neutral";
  }
};

const preload = (src: string) => { const i = new Image(); i.src = src; };

export const ArrivalScreen = ({ onComplete }: ArrivalScreenProps) => {
  const { profile } = useAuth();
  const { playSound } = useSound();
  const g = (profile?.gender || "male") as "male" | "female";
  const [phase, setPhase] = useState<Phase>("storefront");
  const [dialogueIndex, setDialogueIndex] = useState(0);

  const ambientScene: SceneAudioKey = phase === "storefront" ? "storefront_street" : "store_interior";
  useSceneAmbience(ambientScene);

  const enteringImg = g === "female" ? velaroEnteringFemaleImg : velaroEnteringMaleImg;
  const greetingImg = g === "female" ? hishamGreetingFemaleImg : hishamGreetingMaleImg;
  const officeImg = g === "female" ? hishamOfficeSeatedFemaleImg : hishamOfficeSeatedMaleImg;

  // Preload next phase images
  useEffect(() => {
    if (phase === "storefront") preload(enteringImg);
    if (phase === "entering") preload(velaroInteriorWideImg);
    if (phase === "interior") { preload(greetingImg); preload(officeImg); }
  }, [phase, enteringImg, greetingImg, officeImg]);

  // Auto-advance entering → interior → dialogue
  useEffect(() => {
    if (phase === "entering") {
      // Footstep SFX removed (was harsh) — bell is the only entry cue now.
      setTimeout(() => { try { playSound("storeBell"); } catch { /* noop */ } }, 400);
      const t = setTimeout(() => setPhase("interior"), 1700);
      return () => clearTimeout(t);
    }
    if (phase === "interior") {
      const t = setTimeout(() => setPhase("dialogue"), 2000);
      return () => clearTimeout(t);
    }
  }, [phase, playSound]);

  const dialogues = useMemo(() => HISHAM_GREETING.map((line) => {
    const adjusted = applyGenderToLine(line, g);
    return {
      characterId: adjusted.characterId,
      text: adjusted.text,
      mood: mapMood(adjusted.mood),
      audioSrc: adjusted.audioSrc,
    };
  }), [g]);

  // Dialogue background swaps from greeting → office after 2 lines
  const dialogueBg = dialogueIndex < 2 ? greetingImg : officeImg;

  const currentImg =
    phase === "storefront" ? velaroStorefrontImg :
    phase === "entering" ? enteringImg :
    phase === "interior" ? velaroInteriorWideImg :
    dialogueBg;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImg}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        >
          <img src={currentImg} alt="VELARO scene" className="w-full h-full object-cover animate-ken-burns" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* STOREFRONT */}
      {phase === "storefront" && (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <motion.div
            className="flex flex-col items-center px-8 py-5 rounded-2xl bg-card/65 backdrop-blur-sm border border-border mb-6"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-accent text-sm font-bold">وصلت متجر VELARO</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1 tracking-[0.3em]">VELARO</h1>
            <p className="text-muted-foreground text-xs" dir="rtl">أ. هشام مستنيك جوه</p>
          </motion.div>

          <motion.button
            className="imp-action relative px-8 py-3 rounded-xl text-base font-bold overflow-hidden group"
            onClick={() => setPhase("entering")}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-200%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            <span className="relative z-10 flex items-center gap-2 text-white">
              <DoorOpen className="w-5 h-5" />
              ادخل المتجر
            </span>
          </motion.button>
        </div>
      )}

      {/* INTERIOR (caption) */}
      {phase === "interior" && (
        <motion.div
          className="relative z-10 flex flex-col items-center justify-end min-h-screen pb-20 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="px-6 py-3 rounded-xl bg-card/65 backdrop-blur-sm border border-border"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-foreground text-sm font-bold tracking-widest" dir="rtl">صالة VELARO الرئيسية</p>
          </motion.div>
        </motion.div>
      )}

      {/* DIALOGUE */}
      {phase === "dialogue" && (
        <>
          <motion.div
            className="relative z-10 pt-10 pb-4 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-muted-foreground text-xs">🏪 داخل المتجر</p>
            <h2 className="text-accent font-bold text-lg tracking-[0.2em]">VELARO</h2>
          </motion.div>

          <EnhancedDialogue
            dialogues={dialogues}
            isActive={true}
            onComplete={onComplete}
            currentIndex={dialogueIndex}
            onIndexChange={setDialogueIndex}
            playerName={profile?.display_name || "محلل"}
            playerGender={g}
          />
        </>
      )}
    </div>
  );
};
