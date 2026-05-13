import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, BookOpen, CheckCircle2 } from "lucide-react";
import { usePFGame } from "@/contexts/PFGameContext";
import { useSound } from "@/hooks/useSoundEffects";
import { useSceneAmbience } from "@/hooks/useSceneAudio";
import { PFNotebook } from "../PFNotebook";
import { StampEffect } from "../StampEffect";
import framingBoardDeskImg from "@/assets/scenes/framing-board-desk.webp";

interface FramingScreenProps {
  onComplete: () => void;
}

type Stage = "background" | "sections" | "summary";

export const FramingScreen = ({ onComplete }: FramingScreenProps) => {
  const { state, framingSections, setFramingSelection, submitFraming } = usePFGame();
  const { playSound } = useSound();
  useSceneAmbience("report_writing");

  const [stage, setStage] = useState<Stage>("background");
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [flash, setFlash] = useState(false);

  const allSelected = useMemo(
    () =>
      !!state.framing.true_frame &&
      !!state.framing.next_decision,
    [state.framing]
  );

  // Cinematic intro: show background only, then reveal sections
  useEffect(() => {
    const t = setTimeout(() => {
      setStage("sections");
      try { playSound("reveal"); } catch {}
    }, 1800);
    return () => clearTimeout(t);
  }, [playSound]);

  const handleSelect = (sectionId: keyof typeof state.framing, optionId: string) => {
    if (confirmed) return;
    setFramingSelection(sectionId, optionId);
    // Removed paperRustle + tick — harsh "tssss" on every selection.
    try { playSound("click"); } catch { /* noop */ }

    // Auto-advance to next section after a small beat
    setTimeout(() => {
      if (activeSectionIdx < framingSections.length - 1) {
        try { playSound("whoosh"); } catch { /* noop */ }
        setActiveSectionIdx((i) => i + 1);
      } else {
        try { playSound("pageFlip"); } catch { /* noop */ }
        setStage("summary");
      }
    }, 350);
  };

  const handleConfirm = () => {
    if (!allSelected || confirmed) return;
    submitFraming();
    setConfirmed(true);
    setShowStamp(true);
    setFlash(true);
    try { playSound("stamp"); } catch {}
    setTimeout(() => setFlash(false), 120);
    setTimeout(() => {
      setShowStamp(false);
      onComplete();
    }, 1500);
  };

  const currentSection = framingSections[activeSectionIdx];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background — visible from the start, slow Ken Burns */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      >
        <img src={framingBoardDeskImg} alt="" className="w-full h-full object-cover" />
        {/* Lighter overlay so the desk stays visible */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/40 to-background/30"
          initial={{ opacity: 0.55 }}
          animate={{ opacity: stage === "background" ? 0.55 : 0.78 }}
          transition={{ duration: 0.8 }}
        />
      </motion.div>

      <AnimatePresence>
        {flash && (
          <motion.div
            className="fixed inset-0 z-[90] bg-foreground/40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          />
        )}
      </AnimatePresence>

      <PFNotebook />
      <StampEffect isVisible={showStamp} text="✓ تم التأكيد" />

      {/* Stage 1: Background only — small caption fade */}
      <AnimatePresence>
        {stage === "background" && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.p
              className="text-foreground/85 text-sm italic"
              dir="rtl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              💭 وقت أرتّب أفكاري...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 2: Sequential section reveal (no scroll) */}
      <AnimatePresence mode="wait">
        {stage === "sections" && currentSection && (
          <motion.div
            key={currentSection.id}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Progress dots */}
            <div className="flex gap-2 mb-5">
              {framingSections.map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === activeSectionIdx
                      ? "w-8 bg-primary"
                      : i < activeSectionIdx
                        ? "w-2 bg-primary/60"
                        : "w-2 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <motion.div
              className="imp-panel w-full max-w-xl overflow-hidden rounded-2xl"
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: -10, opacity: 0 }}
              transition={{ type: "spring", damping: 18, stiffness: 200 }}
            >
              <div className="imp-panel-header px-5 py-3 text-right" dir="rtl">
                <h2 className="text-base font-bold">{currentSection.title}</h2>
              </div>

              <div className="space-y-2.5 p-5">
                {currentSection.options.map((option, optionIndex) => {
                  const selected = state.framing[currentSection.id] === option.id;
                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleSelect(currentSection.id, option.id)}
                      className={`w-full p-3 rounded-xl border text-right transition-all ${
                        selected
                          ? "bg-[#fff4f4] border-primary ring-2 ring-primary/20"
                          : "bg-white border-black/15 hover:border-primary hover:bg-[#fff7f7]"
                      }`}
                      dir="rtl"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + optionIndex * 0.06 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                            selected ? "border-primary bg-primary text-white" : "border-black/30 bg-white"
                          }`}
                        >
                          {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <p className="text-[#171717] text-sm font-bold leading-relaxed flex-1">{option.text}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            <motion.p
              className="mt-3 text-xs text-muted-foreground flex items-center gap-1"
              dir="rtl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <BookOpen className="w-3 h-3" />
              راجع الدفتر قبل ما تقرر
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 3: Summary card with confirm */}
      <AnimatePresence>
        {stage === "summary" && (
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="imp-panel w-full max-w-xl overflow-hidden rounded-2xl"
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 20 }}
              dir="rtl"
            >
              <div className="imp-panel-header text-center px-5 py-4">
                <div className="text-3xl mb-2">📋</div>
                <h3 className="font-bold text-base text-white">ملخّص التقرير</h3>
                <p className="text-white/75 text-xs mt-1">راجع الاختيارات قبل ما تعتمدها</p>
              </div>

              <div className="space-y-2.5 p-5 pb-0">
                {framingSections.map((section) => {
                  const selectedOption = section.options.find(
                    (o) => o.id === state.framing[section.id]
                  );
                  return (
                    <div
                      key={section.id}
                      className="p-3 rounded-xl bg-white border border-black/15"
                    >
                      <p className="text-xs text-primary font-bold mb-1">{section.title}</p>
                      <p className="text-sm text-[#171717] font-bold leading-relaxed">
                        {selectedOption?.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 p-5">
                <button
                  onClick={() => {
                    setStage("sections");
                    setActiveSectionIdx(0);
                  }}
                  className="imp-outline px-4 py-2.5 rounded-xl text-sm font-bold hover:border-primary hover:text-primary"
                  disabled={confirmed}
                >
                  مراجعة
                </button>
                <motion.button
                  onClick={handleConfirm}
                  className="imp-action flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={confirmed}
                >
                  <Target className="w-4 h-4" />
                  قدّم التقرير
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
