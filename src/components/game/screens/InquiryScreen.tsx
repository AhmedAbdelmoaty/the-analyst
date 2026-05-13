import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, Sparkles } from "lucide-react";
import { usePFGame } from "@/contexts/PFGameContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/hooks/useSoundEffects";
import { useSceneAmbience } from "@/hooks/useSceneAudio";
import { EnhancedDialogue } from "../EnhancedDialogue";
import { AnimatedCharacter } from "../AnimatedCharacter";
import { PFNotebook } from "../PFNotebook";
import { TOTAL_QUESTION_BUDGET } from "@/lib/pf-case/case-tree";
import type { ChoicePresentation } from "@/lib/pf-case-engine/gameStateMachine";
import type { EvidenceData } from "@/lib/pf-case/evidence-catalog";
import { getHeshamVoice } from "@/lib/voiceover/heshamVoiceMap";
import { getVoiceoverSrc } from "@/lib/voiceover/genderedDialogue";
import { getAnalystVoice } from "@/lib/voiceover/analystVoiceMap";
import { renderGenderText } from "@/lib/genderText";
import { playVoice } from "@/lib/assetPreloader";
import analystImg from "@/assets/characters/analyst.webp";
import saraImg from "@/assets/characters/sara.webp";
import velaroInteriorWideImg from "@/assets/scenes/velaro-interior-wide.webp";
import velaroCheckoutBusyImg from "@/assets/scenes/velaro-checkout-busy.webp";
import velaroWomensSectionImg from "@/assets/scenes/velaro-womens-section.webp";
import velaroMensSectionImg from "@/assets/scenes/velaro-mens-section.webp";
import hishamOfficeSeatedMaleImg from "@/assets/scenes/hisham-office-seated-male.webp";
import hishamOfficeSeatedFemaleImg from "@/assets/scenes/hisham-office-seated-female.webp";
import hishamGreetingMaleImg from "@/assets/scenes/hisham-greeting-male.webp";
import hishamGreetingFemaleImg from "@/assets/scenes/hisham-greeting-female.webp";
import hishamHandingReportMaleImg from "@/assets/scenes/hisham-handing-report-male.webp";
import hishamHandingReportFemaleImg from "@/assets/scenes/hisham-handing-report-female.webp";

interface InquiryScreenProps {
  onComplete: () => void;
}

interface DialogueLineUI {
  characterId: string;
  text: string;
  mood?: "neutral" | "happy" | "suspicious";
  isSaveable?: boolean;
  saveId?: string;
  saveText?: string;
  inlineEvidence?: EvidenceData;
  audioSrc?: string;
}

type InquiryPhase = "preQuestions" | "choosing" | "askingQuestion" | "dialogue";

interface ActiveQuestion {
  option: ChoicePresentation;
  text: string;
  audioSrc?: string;
}

const QUESTION_TO_DIALOGUE_DELAY_MS = 520;
const QUESTION_FALLBACK_MS = 1200;

export const InquiryScreen = ({ onComplete }: InquiryScreenProps) => {
  const { state, getChoices, pickChoice, collectInquiryFindings, restartInquiry, canRestart, markGameStarted } = usePFGame();

  useEffect(() => { markGameStarted(); }, [markGameStarted]);
  const { profile } = useAuth();
  const { playSound } = useSound();
  useSceneAmbience("store_interior");

  const [phase, setPhase] = useState<InquiryPhase>("preQuestions");
  const [currentLines, setCurrentLines] = useState<DialogueLineUI[]>([]);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [dialogueKey, setDialogueKey] = useState(0);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [questionProgress, setQuestionProgress] = useState(0);
  const selectionTimerRef = useRef<number | null>(null);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionCommittedRef = useRef(false);
  const questionFallbackTimerRef = useRef<number | null>(null);

  const playerName = profile?.display_name || "محلل";
  const g = (profile?.gender || "male") as "male" | "female";

  const choices = getChoices();

  // Restart button visible: between Q1 and Q4, only if attempt still available
  const showRestartButton =
    canRestart &&
    state.questionsUsed >= 1 &&
    state.questionsUsed < 4 &&
    !state.isComplete &&
    phase === "choosing";

  const handleConfirmRestart = () => {
    try { playSound("pageFlip"); } catch { /* noop */ }
    restartInquiry();
    setShowRestartConfirm(false);
    setPhase("preQuestions");
    setCurrentLines([]);
    setDialogueIndex(0);
    setSelectedChoiceId(null);
    setActiveQuestion(null);
    setQuestionProgress(0);
  };

  useEffect(() => {
    return () => {
      if (selectionTimerRef.current) window.clearTimeout(selectionTimerRef.current);
      if (questionFallbackTimerRef.current) window.clearTimeout(questionFallbackTimerRef.current);
    };
  }, []);

  const dialogueScene = useMemo(() => {
    const ownerBase = g === "female" ? hishamGreetingFemaleImg : hishamGreetingMaleImg;
    const ownerOffice = g === "female" ? hishamOfficeSeatedFemaleImg : hishamOfficeSeatedMaleImg;
    const reportScene = g === "female" ? hishamHandingReportFemaleImg : hishamHandingReportMaleImg;

    // Only show the "handing sales report" scene when the evidence is an actual sales report
    // (monthly/yearly/daily/weekly sales charts). Team performance, competitor offers,
    // customer feedback, and marketing summaries should NOT trigger this image.
    const SALES_REPORT_IDS = new Set([
      "ev_year_vs_year",
      "ev_three_year",
      "ev_breakdown",
      "ev_daily_sales",
      "ev_weekly_sales",
    ]);
    const hasSalesReport = currentLines.some(
      (line) => line.inlineEvidence && SALES_REPORT_IDS.has(line.inlineEvidence.id)
    );

    if (hasSalesReport) return reportScene;
    if (state.trackEntered === "A") return velaroMensSectionImg;
    if (state.trackEntered === "C") return velaroWomensSectionImg;
    if (state.trackEntered === "D") return velaroCheckoutBusyImg;
    if (phase === "dialogue") return ownerOffice;
    if (state.questionsUsed === 0) return ownerBase;
    return velaroInteriorWideImg;
  }, [currentLines, g, phase, state.trackEntered, state.questionsUsed]);

  const stopQuestionAudio = useCallback(() => {
    const a = questionAudioRef.current;
    if (a) {
      try { a.pause(); a.currentTime = 0; } catch { /* noop */ }
      questionAudioRef.current = null;
    }
  }, []);

  const clearQuestionFallbackTimer = useCallback(() => {
    if (!questionFallbackTimerRef.current) return;
    window.clearTimeout(questionFallbackTimerRef.current);
    questionFallbackTimerRef.current = null;
  }, []);

  const commitQuestionToDialogue = useCallback(
    (optionOverride?: ChoicePresentation) => {
      if (questionCommittedRef.current) return;

      const option = optionOverride ?? activeQuestion?.option;
      if (!option) return;

      questionCommittedRef.current = true;
      clearQuestionFallbackTimer();
      stopQuestionAudio();
      setQuestionProgress(1);

      const result = pickChoice(option);
      if (!result) {
        setSelectedChoiceId(null);
        setActiveQuestion(null);
        setQuestionProgress(0);
        setPhase("choosing");
        return;
      }

      const baseMaleText = result.responseText;
      const baseMaleAudio = getHeshamVoice(baseMaleText);
      const finalText = renderGenderText(baseMaleText, g);
      const finalAudio = getVoiceoverSrc(baseMaleAudio, g);

      const lines: DialogueLineUI[] = [
        {
          characterId: "hisham",
          text: finalText,
          mood: option.isCorrect ? "happy" : "neutral",
          isSaveable: !!result.noteId,
          saveId: result.noteId,
          saveText: result.noteText,
          inlineEvidence: result.evidence,
          audioSrc: finalAudio,
        },
      ];

      setCurrentLines(lines);
      setDialogueIndex(0);
      setDialogueKey((k) => k + 1);
      setSelectedChoiceId(null);
      setActiveQuestion(null);
      setPhase("dialogue");
    },
    [activeQuestion, clearQuestionFallbackTimer, g, pickChoice, stopQuestionAudio]
  );

  const handlePick = useCallback(
    (option: typeof choices[number]) => {
      if (selectedChoiceId || phase !== "choosing") return;
      if (selectionTimerRef.current) {
        window.clearTimeout(selectionTimerRef.current);
        selectionTimerRef.current = null;
      }
      setSelectedChoiceId(option.id);
      setActiveQuestion({
        option,
        text: renderGenderText(option.text, g),
        audioSrc: getAnalystVoice(option.text, g),
      });
      setQuestionProgress(0);
      questionCommittedRef.current = false;
      try { playSound("click"); } catch { /* noop */ }
      setTimeout(() => { try { playSound("whoosh"); } catch { /* noop */ } }, 120);

      selectionTimerRef.current = window.setTimeout(() => {
        selectionTimerRef.current = null;
        setPhase("askingQuestion");
      }, QUESTION_TO_DIALOGUE_DELAY_MS);
    },
    [phase, playSound, selectedChoiceId, g]
  );

  useEffect(() => {
    if (phase !== "askingQuestion" || !activeQuestion) return;

    let cancelled = false;
    let progressTimer: number | null = null;
    let voiceHandle: { audio: HTMLAudioElement; stop: () => void } | null = null;

    clearQuestionFallbackTimer();
    stopQuestionAudio();
    setQuestionProgress(0.04);

    const finish = () => {
      if (!cancelled) commitQuestionToDialogue(activeQuestion.option);
    };

    // Hard fallback so the question phase NEVER hangs, even if audio
    // is missing, blocked, stalled, or never fires an event.
    const startFallback = (ms: number = QUESTION_FALLBACK_MS) => {
      clearQuestionFallbackTimer();
      questionFallbackTimerRef.current = window.setTimeout(finish, ms);
    };

    progressTimer = window.setInterval(() => {
      const audio = voiceHandle?.audio;
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        setQuestionProgress(Math.min(audio.currentTime / audio.duration, 0.96));
        return;
      }
      setQuestionProgress((prev) => Math.min(prev + 0.035, 0.88));
    }, 120);

    if (!activeQuestion.audioSrc) {
      startFallback();
    } else {
      // Use the unified audio pipeline. playVoice() always resolves
      // (on ended / error / abort / stalled / safety timeout) — it can
      // never leave the question phase stuck.
      try {
        // Lazy import via require-style is unnecessary; static import is fine.
        const handle = playVoice(activeQuestion.audioSrc, 12000);
        voiceHandle = handle;
        questionAudioRef.current = handle.audio;
        handle.done.then(() => { if (!cancelled) finish(); });
        // Also arm a defensive long fallback in case playVoice itself misbehaves.
        startFallback(13000);
      } catch {
        startFallback();
      }
    }

    return () => {
      cancelled = true;
      if (progressTimer) window.clearInterval(progressTimer);
      clearQuestionFallbackTimer();
      if (voiceHandle) voiceHandle.stop();
    };
  }, [
    activeQuestion,
    clearQuestionFallbackTimer,
    commitQuestionToDialogue,
    phase,
    stopQuestionAudio,
  ]);

  // Stop question audio if component unmounts or phase changes away
  useEffect(() => {
    return () => {
      stopQuestionAudio();
      clearQuestionFallbackTimer();
    };
  }, [clearQuestionFallbackTimer, stopQuestionAudio]);


  const handleDialogueComplete = useCallback(() => {
    if (state.isComplete) {
      onComplete();
      return;
    }
    setSelectedChoiceId(null);
    setActiveQuestion(null);
    setQuestionProgress(0);
    setPhase("choosing");
  }, [state.isComplete, onComplete]);

  useEffect(() => {
    if (state.isComplete && phase !== "dialogue") {
      onComplete();
    }
  }, [state.isComplete, phase, onComplete]);

  useEffect(() => {
    if (state.isComplete) return;

    if (phase === "preQuestions" && state.questionsUsed > 0) {
      setPhase("choosing");
      return;
    }

    if (phase === "askingQuestion" && !activeQuestion) {
      setSelectedChoiceId(null);
      setQuestionProgress(0);
      setPhase("choosing");
      return;
    }

    if (phase === "dialogue" && currentLines.length === 0) {
      setSelectedChoiceId(null);
      setActiveQuestion(null);
      setQuestionProgress(0);
      setPhase("choosing");
      return;
    }

    if (phase === "choosing" && choices.length === 0) {
      onComplete();
    }
  }, [
    activeQuestion,
    choices.length,
    currentLines.length,
    onComplete,
    phase,
    state.isComplete,
    state.questionsUsed,
  ]);

  const progressDots = Array.from({ length: TOTAL_QUESTION_BUDGET }, (_, i) => i);

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatePresence mode="wait">
        <motion.div key={dialogueScene} className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          <img src={dialogueScene} alt="VELARO conversation scene" className="w-full h-full object-cover animate-ken-burns" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="fixed top-4 right-4 z-20 flex gap-1.5">
        {progressDots.map((i) => (
          <motion.div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < state.questionsUsed ? "bg-primary" : i === state.questionsUsed ? "bg-primary/60 ring-2 ring-primary/30" : "bg-muted"}`} />
        ))}
      </div>

      <PFNotebook />

      {/* Restart inquiry button — up to 2 uses, only mid-game */}
      <AnimatePresence>
        {showRestartButton && (
          <motion.button
            key="restart-btn"
            onClick={() => setShowRestartConfirm(true)}
            className="fixed top-4 left-4 z-[55] flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2.5 text-xs font-bold text-[#171717] shadow-lg shadow-black/20 transition-all hover:scale-105 hover:border-primary hover:text-primary"
            initial={{ opacity: 0, y: -10 }}
            animate={{
              opacity: 1,
              y: 0,
              boxShadow: [
                "0 4px 14px hsl(var(--primary) / 0.22)",
                "0 4px 22px hsl(var(--primary) / 0.48)",
                "0 4px 14px hsl(var(--primary) / 0.22)",
              ],
            }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
            }}
            whileTap={{ scale: 0.95 }}
            title="اطلب محادثة جديدة من البداية"
            dir="rtl"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>اطلب محادثة جديدة من البداية</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Confirm restart modal */}
      <AnimatePresence>
        {showRestartConfirm && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRestartConfirm(false)}
          >
            <motion.div
              className="imp-panel max-w-sm w-full rounded-2xl p-5 shadow-2xl"
              dir="rtl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-[#171717]">اطلب محادثة جديدة من البداية؟</h3>
              </div>
              <p className="text-sm text-[#343434] leading-relaxed mb-4">
                هترجع تاني لمشهد دخولك المحل ومحادثة الترحيب مع أ. هشام، وكل الملاحظات والتقارير اللي جمعتها هتتمسح. متبقّى لك{" "}
                <span className="text-primary font-bold">{2 - state.restartCount}</span> محاولة.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRestartConfirm(false)}
                  className="imp-outline flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors hover:border-primary hover:text-primary"
                >
                  لا، كمل
                </button>
                <button
                  onClick={handleConfirmRestart}
                  className="imp-action flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors"
                >
                  أيوه، ابدأ من الأول
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === "preQuestions" && state.questionsUsed === 0 && !state.isComplete && (
          <motion.div
            key="pre-questions"
            className="fixed inset-0 z-40 flex items-end justify-center pb-8 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="imp-panel max-w-md w-full overflow-hidden rounded-3xl text-center"
              dir="rtl"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.35 }}
            >
              <div className="imp-panel-header px-6 py-4">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 border border-white/35">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
      
              <h2 className="text-xl font-bold text-white">
                قبل ما تبدأ تحليل البيانات
              </h2>
              </div>
      
              <div className="p-6">
              <p className="mb-6 text-sm leading-7 text-[#343434]">
                اختار أسئلتك بعناية؛ كل إجابة هتضيف جزءًا من الصورة، وبعدها هتكتب تقريرك بناءً على اللي وصلت له.
              </p>
      
              <button
                onClick={() => setPhase("choosing")}
                className="imp-action w-full rounded-xl px-5 py-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                ابدأ الأسئلة
              </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === "choosing" && choices.length > 0 && !state.isComplete && (
          <motion.div
            key={`choices-${state.currentNodeId}-${state.questionsUsed}`}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-4 pt-24 sm:pb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="pointer-events-auto w-full max-w-3xl">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {choices.map((option, i) => {
                  const isSelected = selectedChoiceId === option.id;
                  const isDeferred = !!selectedChoiceId && selectedChoiceId !== option.id;

                  return (
                    <motion.button
                      key={option.id}
                      layoutId={`question-choice-${option.id}`}
                      onClick={() => handlePick(option)}
                      disabled={!!selectedChoiceId}
                      className={`imp-choice-card group relative min-h-[124px] overflow-hidden rounded-[18px] p-0 text-right backdrop-blur-md transition-all disabled:cursor-default ${isSelected ? "imp-choice-card-selected" : ""}`}
                      dir="rtl"
                      initial={{ opacity: 0, y: 28, scale: 0.97 }}
                      animate={
                        isSelected
                          ? {
                              opacity: [1, 1, 0.96],
                              y: [0, -18, -74],
                              scale: [1, 1.025, 0.96],
                              x: i === 0 ? [0, 16, 28] : [0, -16, -28],
                              filter: ["brightness(1)", "brightness(1.12)", "brightness(1.08)"],
                            }
                          : isDeferred
                            ? {
                                opacity: 0,
                                x: i === 0 ? -96 : 96,
                                y: 22,
                                scale: 0.92,
                                filter: "grayscale(0.75) blur(2px)",
                              }
                            : { opacity: 1, y: 0, x: 0, scale: 1, filter: "brightness(1)" }
                      }
                      transition={{ delay: selectedChoiceId ? 0 : i * 0.07, duration: selectedChoiceId ? 0.52 : 0.42, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={!selectedChoiceId ? { scale: 1.012, y: -3 } : undefined}
                      whileTap={!selectedChoiceId ? { scale: 0.98 } : undefined}
                      exit={{ opacity: 0, y: -24, transition: { duration: 0.2 } }}
                    >
                      <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-l from-transparent via-primary/55 to-transparent" />
                      <span className="absolute bottom-0 right-5 h-1 w-16 rounded-t-full bg-primary/75 transition-all group-hover:w-[calc(100%-2.5rem)]" />
                      <span className="absolute left-4 top-4 h-2.5 w-2.5 rounded-full bg-primary/70 shadow-[0_0_14px_hsl(var(--primary)/0.28)]" />

                      <div className="relative z-10 flex min-h-[112px] items-center justify-center px-6 py-5 sm:px-7">
                        <p className="break-words text-center text-[14px] font-bold leading-7 text-[#171717] transition-colors group-hover:text-[#111] sm:text-right sm:text-[15px] md:text-base">
                          {renderGenderText(option.text, g)}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asking phase - the selected question becomes an in-scene player line. */}
      <AnimatePresence>
        {phase === "askingQuestion" && activeQuestion && (
          <motion.div
            key="asking-question"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-4 pt-28 sm:pb-6"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="pointer-events-auto w-full max-w-3xl"
              dir="rtl"
              initial={{ scale: 0.97 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 220 }}
            >
              <div className="flex items-end gap-3 sm:gap-4">
                <motion.div
                  className="relative shrink-0"
                  initial={{ opacity: 0, scale: 0.84, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 12 }}
                  transition={{ type: "spring", damping: 16 }}
                >
                  <AnimatedCharacter
                    characterId="detective"
                    size="md"
                    isActive
                    isSpeaking
                    mood="neutral"
                    showName={false}
                    entrance="zoom"
                    imageOverride={g === "female" ? saraImg : analystImg}
                  />
                </motion.div>

                <motion.div
                  layoutId={`question-choice-${activeQuestion.option.id}`}
                  className="relative flex-1 overflow-hidden rounded-[18px] border border-white/80 bg-[#fffdf8]/95 p-4 pl-12 shadow-[0_18px_46px_rgba(0,0,0,0.28),inset_0_0_0_1px_rgba(17,17,17,0.08)] backdrop-blur-md sm:p-5 sm:pl-14"
                >
                  <span className="absolute -right-2 bottom-7 hidden h-4 w-4 rotate-45 border-b border-r border-white/80 bg-[#fffdf8] sm:block" />
                  <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-l from-transparent via-primary/60 to-transparent" />
                  <span className="absolute bottom-0 right-5 h-1 w-28 rounded-t-full bg-primary/75" />

                  <p className="max-h-[34vh] overflow-y-auto break-words pr-1 text-right text-[15px] font-bold leading-8 text-[#171717] sm:text-base">
                    {activeQuestion.text}
                  </p>

                  <button
                    type="button"
                    onClick={() => commitQuestionToDialogue()}
                    className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-black/15 bg-white text-primary transition-colors hover:border-primary hover:bg-primary hover:text-white"
                    aria-label="تخطي"
                    title="تخطي"
                  >
                    <SkipForward className="h-4 w-4 rotate-180" />
                  </button>

                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/10">
                    <motion.div
                      className="absolute bottom-0 right-0 h-full bg-primary"
                      initial={{ width: "4%" }}
                      animate={{ width: `${Math.max(4, Math.min(questionProgress, 1) * 100)}%` }}
                      transition={{ duration: 0.12, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "dialogue" && currentLines.length > 0 && (
        <EnhancedDialogue
          key={dialogueKey}
          dialogues={currentLines}
          isActive={true}
          onComplete={handleDialogueComplete}
          currentIndex={dialogueIndex}
          onIndexChange={setDialogueIndex}
          savedNoteIds={state.savedNoteIds}
          playerName={playerName}
          playerGender={g}
          onCollectFindings={collectInquiryFindings}
        />
      )}

    </div>
  );
};
