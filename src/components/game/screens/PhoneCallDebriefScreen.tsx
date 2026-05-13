import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone } from "lucide-react";
import { usePFGame } from "@/contexts/PFGameContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSceneAmbience } from "@/hooks/useSceneAudio";

import { EnhancedDialogue } from "../EnhancedDialogue";
import { ImpLogoReveal } from "../ImpLogoReveal";
import {
  MANSOUR_CALL_STRONG,
  MANSOUR_CALL_WEAK,
} from "@/lib/pf-case/mansour-call-scripts";
import {
  pickMansourImage,
  pickAnalystImage,
  type CallTier,
} from "@/lib/pf-case/mansour-call-images";
import { applyGenderToLine } from "@/lib/voiceover/genderedDialogue";

interface PhoneCallDebriefScreenProps {
  onComplete: () => void;
}

type DialogueMood = "neutral" | "happy" | "nervous" | "angry" | "suspicious";

const mapMood = (mood?: string): DialogueMood => {
  switch (mood) {
    case "happy": return "happy";
    case "concerned": return "nervous";
    case "impressed": return "happy";
    case "disappointed": return "angry";
    case "uncertain": return "suspicious";
    case "angry": return "angry";
    case "nervous": return "nervous";
    default: return "neutral";
  }
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export const PhoneCallDebriefScreen = ({ onComplete }: PhoneCallDebriefScreenProps) => {
  const { state } = usePFGame();
  const { profile } = useAuth();
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useSceneAmbience(null);

  const g = (profile?.gender || "male") as "male" | "female";
  const playerName = profile?.display_name || "محلل";
  const tier: CallTier = (state.outcome || "weak") as CallTier;

  const sourceLines = useMemo(() => {
    return tier === "strong" ? MANSOUR_CALL_STRONG : MANSOUR_CALL_WEAK;
  }, [tier]);

  const dialogues = useMemo(
    () =>
      sourceLines.map((line) => {
        const adjusted = applyGenderToLine(line, g);
        return {
          characterId: adjusted.characterId,
          text: adjusted.text,
          mood: mapMood(adjusted.mood),
          audioSrc: adjusted.audioSrc,
        };
      }),
    [sourceLines, g]
  );

  // Pre-compute, for each dialogue index, who speaks and which "mansour line index"
  // it corresponds to (so we can pick image A vs B based on Mansour-only progression).
  const speakerMap = useMemo(() => {
    let mansourCounter = 0;
    return sourceLines.map((line) => {
      const isMansour = line.characterId === "mansour";
      const entry = {
        isMansour,
        mansourIdx: isMansour ? mansourCounter : -1,
      };
      if (isMansour) mansourCounter += 1;
      return entry;
    });
  }, [sourceLines]);

  const totalMansourLines = useMemo(
    () => sourceLines.filter((l) => l.characterId === "mansour").length,
    [sourceLines]
  );

  const analystImg = useMemo(() => pickAnalystImage(g, tier), [g, tier]);

  // Determine which background to show based on the CURRENT speaker.
  const currentSpeaker = speakerMap[dialogueIndex] ?? speakerMap[0];
  const currentBg = currentSpeaker?.isMansour
    ? pickMansourImage(tier, currentSpeaker.mansourIdx, totalMansourLines)
    : analystImg;

  useEffect(() => {
    const i = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(i);
  }, []);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Crossfading background — Mansour when he speaks, analyst when player speaks */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentBg}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.8 }, scale: { duration: 1.4 } }}
        >
          <img
            src={currentBg}
            alt="Phone call scene"
            className="w-full h-full object-cover animate-ken-burns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-background/50" />
        </motion.div>
      </AnimatePresence>

      {/* Call indicator */}
      <motion.div
        className="absolute top-12 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 backdrop-blur-md"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
          <Phone className="w-3.5 h-3.5 text-emerald-400" />
        </motion.div>
        <span className="text-emerald-400 text-xs font-bold" dir="rtl">
          مكالمة مع أ. منصور
        </span>
        <span className="text-emerald-300/80 text-xs font-mono">{formatTime(seconds)}</span>
      </motion.div>

      <EnhancedDialogue
        dialogues={dialogues}
        isActive={true}
        onComplete={onComplete}
        currentIndex={dialogueIndex}
        onIndexChange={setDialogueIndex}
        playerName={playerName}
        playerGender={g}
        renderOverlay={({ currentIndex, currentDialogue }) => {
          const isFinalStrongImpLine =
            tier === "strong" &&
            currentIndex === dialogues.length - 1 &&
            currentDialogue?.characterId === "detective" &&
            currentDialogue.text.includes("IMP");

          return isFinalStrongImpLine ? <ImpLogoReveal key="imp-logo-reveal" /> : null;
        }}
      />
    </div>
  );
};
