import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookmarkPlus, Check, X, ChevronRight, FileText, StickyNote } from "lucide-react";
import { AnimatedCharacter, type CharacterId } from "./AnimatedCharacter";
import { ReportDocument } from "./ReportDocument";
import type { EvidenceData } from "@/lib/pf-case/evidence-catalog";
import analystImg from "@/assets/characters/analyst.webp";
import saraImg from "@/assets/characters/sara.webp";
import { getAudio } from "@/lib/assetPreloader";

interface DialogueLine {
  characterId: string;
  text: string;
  mood?: "neutral" | "happy" | "nervous" | "angry" | "suspicious";
  isSaveable?: boolean;
  saveId?: string;
  saveText?: string;
  audioSrc?: string;
  inlineEvidence?: EvidenceData;
}

interface EnhancedDialogueProps {
  dialogues: DialogueLine[];
  isActive: boolean;
  onComplete?: () => void;
  onClose?: () => void;
  allowClickOutside?: boolean;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  onSaveNote?: (saveId: string, saveText: string) => void;
  onCollectFindings?: (payload: { noteId?: string; noteText?: string; evidenceId?: string }) => void;
  savedNoteIds?: string[];
  playerName?: string;
  playerGender?: "male" | "female";
  renderOverlay?: (context: {
    currentIndex: number;
    isTyping: boolean;
    currentDialogue?: DialogueLine;
  }) => ReactNode;
}

type FlyingCollectible = {
  id: number;
  kind: "note" | "report";
  noteId?: string;
  noteText?: string;
  evidenceId?: string;
};

const characterColors: Record<string, { bg: string; border: string; name: string }> = {
  ahmed: { bg: "from-cyan-900/90 to-cyan-950/90", border: "border-cyan-500/50", name: "text-cyan-400" },
  sara: { bg: "from-purple-900/90 to-purple-950/90", border: "border-purple-500/50", name: "text-purple-400" },
  karim: { bg: "from-red-900/90 to-red-950/90", border: "border-red-500/50", name: "text-red-400" },
  detective: { bg: "from-amber-900/90 to-amber-950/90", border: "border-amber-500/50", name: "text-amber-400" },
  hisham: { bg: "from-teal-900/90 to-teal-950/90", border: "border-teal-500/50", name: "text-teal-400" },
  khaled: { bg: "from-red-900/90 to-red-950/90", border: "border-red-500/50", name: "text-red-400" },
  noura: { bg: "from-purple-900/90 to-purple-950/90", border: "border-purple-500/50", name: "text-purple-400" },
  umFahd: { bg: "from-cyan-900/90 to-cyan-950/90", border: "border-cyan-500/50", name: "text-cyan-400" },
  mansour: { bg: "from-emerald-900/90 to-emerald-950/90", border: "border-emerald-500/50", name: "text-emerald-400" },
};

const characterNames: Record<string, { ar: string; en: string }> = {
  ahmed: { ar: "أحمد", en: "Ahmed" },
  sara: { ar: "سارة", en: "Sara" },
  karim: { ar: "كريم", en: "Karim" },
  detective: { ar: "المحلل", en: "Analyst" },
  hisham: { ar: "أ. هشام", en: "Hisham El Sherif" },
  khaled: { ar: "خالد", en: "Khaled" },
  noura: { ar: "نورة", en: "Noura" },
  umFahd: { ar: "أميرة", en: "Amira" },
  mansour: { ar: "أ. منصور", en: "مديرك المباشر" },
};

export const EnhancedDialogue = ({
  dialogues,
  isActive,
  onComplete,
  onClose,
  allowClickOutside = false,
  currentIndex: externalIndex,
  onIndexChange,
  onSaveNote,
  onCollectFindings,
  savedNoteIds = [],
  playerName,
  playerGender,
  renderOverlay,
}: EnhancedDialogueProps) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [collectibles, setCollectibles] = useState<FlyingCollectible[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [autoSignal, setAutoSignal] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const audioLineTokenRef = useRef(0);
  const typingDoneRef = useRef(false);
  const audioDoneRef = useRef(false);
  const collectibleIdRef = useRef(0);
  const collectionStartedRef = useRef(false);
  const collectionTimersRef = useRef<number[]>([]);
  const remainingCollectiblesRef = useRef(0);
  const committedCollectiblesRef = useRef<Set<number>>(new Set());

  const stopAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {/* noop */}
      audioRef.current = null;
    }
  };

  const clearAutoAdvanceTimer = useCallback(() => {
    if (!autoAdvanceTimerRef.current) return;
    window.clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
  }, []);

  const getCachedAudio = (src: string): HTMLAudioElement => {
    let a = audioCacheRef.current.get(src);
    if (!a) {
      // Route through the unified pipeline so the cache is shared
      // with the boot preloader and the rest of the game.
      a = getAudio(src);
      audioCacheRef.current.set(src, a);
    }
    return a;
  };

  const currentIndex = externalIndex ?? internalIndex;
  const setCurrentIndex = onIndexChange ?? setInternalIndex;
  
  const currentDialogue = dialogues[currentIndex];
  const colors = characterColors[currentDialogue?.characterId || "detective"];
  const isDetective = currentDialogue?.characterId === "detective";
  const resolvedNames = isDetective && playerName
    ? { ar: playerName, en: playerName }
    : characterNames[currentDialogue?.characterId || "detective"];
  const detectiveImageOverride = isDetective && playerGender
    ? (playerGender === "female" ? saraImg : analystImg)
    : undefined;

  const clearCollectionTimers = useCallback(() => {
    collectionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    collectionTimersRef.current = [];
  }, []);

  const beginCollection = useCallback(() => {
    if (!currentDialogue || collectionStartedRef.current) return;
    collectionStartedRef.current = true;

    if (currentDialogue.isSaveable) {
      setShowSaveButton(true);
    }

    const drops: FlyingCollectible[] = [];
    if (currentDialogue.isSaveable && currentDialogue.saveId && currentDialogue.saveText) {
      drops.push({
        id: 0,
        kind: "note",
        noteId: currentDialogue.saveId,
        noteText: currentDialogue.saveText,
      });
    }
    if (currentDialogue.inlineEvidence) {
      drops.push({
        id: 0,
        kind: "report",
        evidenceId: currentDialogue.inlineEvidence.id,
      });
    }

    if (drops.length === 0) {
      setIsCollecting(false);
      return;
    }

    setIsCollecting(true);
    remainingCollectiblesRef.current = drops.length;

    drops.forEach((drop, index) => {
      const timer = window.setTimeout(() => {
        const id = collectibleIdRef.current + 1;
        collectibleIdRef.current = id;
        setCollectibles((prev) => [...prev, { ...drop, id }]);
      }, 240 + index * 620);
      collectionTimersRef.current.push(timer);
    });
  }, [currentDialogue]);

  const finishTyping = useCallback(() => {
    if (!currentDialogue) return;
    setDisplayedText(currentDialogue.text);
    setIsTyping(false);
    typingDoneRef.current = true;
    setAutoSignal((s) => s + 1);
    beginCollection();
  }, [beginCollection, currentDialogue]);

  const collectCurrentFindingsNow = useCallback(() => {
    if (!currentDialogue) return;

    const payload = {
      noteId: currentDialogue.saveId,
      noteText: currentDialogue.saveText,
      evidenceId: currentDialogue.inlineEvidence?.id,
    };

    if (payload.noteId || payload.evidenceId) {
      onCollectFindings?.(payload);
    }

    clearCollectionTimers();
    setCollectibles([]);
    setIsCollecting(false);
    remainingCollectiblesRef.current = 0;
  }, [clearCollectionTimers, currentDialogue, onCollectFindings]);

  // Reset state when deactivated
  useEffect(() => {
    if (!isActive) {
      stopAudio();
      clearCollectionTimers();
      clearAutoAdvanceTimer();
      setInternalIndex(0);
      setDisplayedText("");
      setIsTyping(false);
      setShowSaveButton(false);
      setCollectibles([]);
      setIsCollecting(false);
    }
  }, [clearAutoAdvanceTimer, clearCollectionTimers, isActive]);

  // Preload all voice-over audio for the current dialogue list so playback is instant
  useEffect(() => {
    if (!isActive) return;
    dialogues.forEach((d) => {
      if (d.audioSrc) getCachedAudio(d.audioSrc);
    });
  }, [dialogues, isActive]);

  // Hard cleanup on unmount: kill any audio so it can't survive a scene change
  useEffect(() => {
    return () => {
      stopAudio();
      clearAutoAdvanceTimer();
      // Also pause every cached audio just in case
      audioCacheRef.current.forEach((a) => {
        try { a.pause(); a.currentTime = 0; } catch { /* noop */ }
      });
    };
  }, [clearAutoAdvanceTimer]);

  // Typing effect
  useEffect(() => {
    if (!isActive || !currentDialogue) return;

    const lineToken = audioLineTokenRef.current + 1;
    audioLineTokenRef.current = lineToken;
    let audioSafetyTimer: number | null = null;
    let stalledGraceTimer: number | null = null;
    let progressWatchTimer: number | null = null;

    const clearAudioTimers = () => {
      if (audioSafetyTimer !== null) {
        window.clearTimeout(audioSafetyTimer);
        audioSafetyTimer = null;
      }
      if (stalledGraceTimer !== null) {
        window.clearTimeout(stalledGraceTimer);
        stalledGraceTimer = null;
      }
      if (progressWatchTimer !== null) {
        window.clearInterval(progressWatchTimer);
        progressWatchTimer = null;
      }
    };

    stopAudio();
    clearCollectionTimers();
    clearAutoAdvanceTimer();
    typingDoneRef.current = false;
    audioDoneRef.current = !currentDialogue.audioSrc;
    collectionStartedRef.current = false;
    remainingCollectiblesRef.current = 0;
    committedCollectiblesRef.current.clear();
    setDisplayedText("");
    setIsTyping(true);
    setShowSaveButton(false);
    setCollectibles([]);
    setIsCollecting(false);

    const text = currentDialogue.text;
    const markAudioDone = () => {
      if (audioLineTokenRef.current !== lineToken || audioDoneRef.current) return;
      audioDoneRef.current = true;
      clearAudioTimers();
      setAutoSignal((s) => s + 1);
    };

    // Play voice over if available — use cached/preloaded audio for instant start
    if (currentDialogue.audioSrc) {
      try {
        const audio = getCachedAudio(currentDialogue.audioSrc);
        try { audio.currentTime = 0; } catch {/* noop */}
        audioRef.current = audio;
        let lastProgressTime = Date.now();
        let lastCurrentTime = 0;
        const estimatedCeilingMs = Math.max(text.length * 180 + 12000, 30000);

        audio.onended = markAudioDone;
        audio.onerror = markAudioDone;
        audio.onabort = markAudioDone;
        audio.onstalled = () => {
          if (stalledGraceTimer !== null) window.clearTimeout(stalledGraceTimer);
          stalledGraceTimer = window.setTimeout(() => {
            if (audioLineTokenRef.current !== lineToken || audioDoneRef.current) return;
            const hasRecovered = audio.currentTime > lastCurrentTime + 0.05 || audio.ended;
            if (hasRecovered) return;
            markAudioDone();
          }, 8000);
        };
        audioSafetyTimer = window.setTimeout(markAudioDone, estimatedCeilingMs);
        progressWatchTimer = window.setInterval(() => {
          if (audioLineTokenRef.current !== lineToken || audioDoneRef.current) {
            clearAudioTimers();
            return;
          }
          if (audio.ended) {
            markAudioDone();
            return;
          }
          if (audio.currentTime > lastCurrentTime + 0.05) {
            lastCurrentTime = audio.currentTime;
            lastProgressTime = Date.now();
            if (stalledGraceTimer !== null) {
              window.clearTimeout(stalledGraceTimer);
              stalledGraceTimer = null;
            }
            return;
          }
          if (!audio.paused && Date.now() - lastProgressTime > 12000) {
            markAudioDone();
          }
        }, 1000);

        const p = audio.play();
        if (p && typeof p.catch === "function") {
          p.catch(markAudioDone);
        }
      } catch {
        audioDoneRef.current = true;
        setAutoSignal((s) => s + 1);
      }
    } else {
      audioDoneRef.current = true;
    }

    // Preload next dialogue's audio so it's ready instantly
    const next = dialogues[currentIndex + 1];
    if (next?.audioSrc) {
      getCachedAudio(next.audioSrc);
    }

    let charIndex = 0;

    const typingInterval = setInterval(() => {
      if (charIndex < text.length) {
        setDisplayedText(text.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        finishTyping();
      }
    }, 30);

    return () => {
      audioLineTokenRef.current += 1;
      clearInterval(typingInterval);
      clearCollectionTimers();
      clearAutoAdvanceTimer();
      clearAudioTimers();
    };
  }, [clearAutoAdvanceTimer, clearCollectionTimers, currentIndex, isActive, currentDialogue, finishTyping]);

  const handleClose = () => {
    if (isCollecting) {
      collectCurrentFindingsNow();
    }
    clearAutoAdvanceTimer();
    stopAudio();
    if (onClose) {
      onClose();
    } else {
      onComplete?.();
    }
  };

  const handleNext = () => {
    clearAutoAdvanceTimer();
    if (isTyping) {
      finishTyping();
      return;
    }

    if (isCollecting) {
      collectCurrentFindingsNow();
    }

    stopAudio();

    if (currentIndex < dialogues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete?.();
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentDialogue.saveId && currentDialogue.saveText && onSaveNote) {
      onSaveNote(currentDialogue.saveId, currentDialogue.saveText);
    }
  };

  const handlePrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isCollecting) {
      collectCurrentFindingsNow();
    }
    clearAutoAdvanceTimer();
    if (currentIndex > 0) {
      stopAudio();
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleBackdropClick = () => {
    if (allowClickOutside) {
      handleClose();
    }
  };

  useEffect(() => {
    if (!isActive || !currentDialogue) return;
    if (!typingDoneRef.current || !audioDoneRef.current) return;
    if (reportOpen) {
      clearAutoAdvanceTimer();
      return;
    }

    clearAutoAdvanceTimer();
    const hasCollectibles = !!(
      (currentDialogue.isSaveable && currentDialogue.saveId && currentDialogue.saveText) ||
      currentDialogue.inlineEvidence
    );
    const delay = hasCollectibles ? 2300 : 650;

    autoAdvanceTimerRef.current = window.setTimeout(() => {
      if (hasCollectibles) {
        collectCurrentFindingsNow();
      }
      stopAudio();
      if (currentIndex < dialogues.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onComplete?.();
      }
    }, delay);

    return clearAutoAdvanceTimer;
  }, [
    autoSignal,
    clearAutoAdvanceTimer,
    collectCurrentFindingsNow,
    currentDialogue,
    currentIndex,
    dialogues.length,
    isActive,
    onComplete,
    reportOpen,
    setCurrentIndex,
  ]);

  // Keyboard navigation: back only. Dialogue advances automatically after voice-over.
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentIndex, isTyping, currentDialogue]);

  if (!isActive || !currentDialogue) return null;

  const isSaved = currentDialogue.saveId ? savedNoteIds.includes(currentDialogue.saveId) : false;
  const validCharacterIds: CharacterId[] = ["ahmed", "sara", "karim", "detective", "hisham", "khaled", "noura", "umFahd", "mansour"];
  const animCharId = validCharacterIds.includes(currentDialogue.characterId as CharacterId)
    ? (currentDialogue.characterId as CharacterId)
    : "detective";
  const overlayLayer = renderOverlay?.({ currentIndex, isTyping, currentDialogue });

  const collectibleLayer = (
    <AnimatePresence>
      {collectibles.map((item) => {
        const Icon = item.kind === "report" ? FileText : StickyNote;
        const label = item.kind === "report" ? "تقرير جديد" : "ملاحظة جديدة";
        const tone =
          item.kind === "report"
            ? "border-[#d9bf78]/55 bg-[#191714]/95 text-[#f7edd4] shadow-[#d9bf78]/25"
            : "border-[#dec890]/70 bg-[#f3e8c7] text-[#332714] shadow-[#e8d39b]/30";

        return (
          <motion.div
            key={item.id}
            className={`fixed z-[95] flex min-w-[132px] items-center gap-2 overflow-hidden rounded-[14px] border px-3.5 py-2.5 text-xs font-bold shadow-2xl backdrop-blur-md ${tone}`}
            style={{ left: "50vw", top: "72vh" }}
            dir="rtl"
            initial={{ opacity: 0, scale: 0.62, x: "-50%", y: 18, rotate: item.kind === "report" ? 5 : -5 }}
            animate={{
              opacity: [0, 1, 1, 1, 0],
              scale: [0.62, 1.1, 1, 0.78, 0.24],
              left: ["50vw", "50vw", "62vw", "82vw", "calc(100vw - 76px)"],
              top: ["72vh", "64vh", "42vh", "18vh", "86px"],
              rotate: item.kind === "report" ? [5, -2, 4, -3, 0] : [-5, 2, -4, 3, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.62, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => {
              if (!committedCollectiblesRef.current.has(item.id)) {
                committedCollectiblesRef.current.add(item.id);
                onCollectFindings?.({
                  noteId: item.noteId,
                  noteText: item.noteText,
                  evidenceId: item.evidenceId,
                });
                remainingCollectiblesRef.current = Math.max(remainingCollectiblesRef.current - 1, 0);
                if (remainingCollectiblesRef.current === 0) {
                  setIsCollecting(false);
                }
              }
              setCollectibles((prev) => prev.filter((drop) => drop.id !== item.id));
            }}
          >
            <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-l from-transparent via-white/60 to-transparent" />
            <span className="absolute -left-5 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15 blur-xl" />
            <Icon className={`h-4 w-4 ${item.kind === "report" ? "text-[#d9bf78]" : "text-[#7b5c1d]"}`} />
            <span>{label}</span>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );

  const reportModalLayer = (
    <AnimatePresence>
      {reportOpen && currentDialogue?.inlineEvidence && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setReportOpen(false)}
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <motion.div
              className="relative max-w-xl w-full my-auto"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setReportOpen(false)}
                className="absolute -top-2 -left-2 z-10 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors shadow-lg"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
              <ReportDocument evidence={currentDialogue.inlineEvidence} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
    <AnimatePresence>{overlayLayer}</AnimatePresence>
    {typeof document !== "undefined" ? createPortal(collectibleLayer, document.body) : collectibleLayer}
    {typeof document !== "undefined" ? createPortal(reportModalLayer, document.body) : reportModalLayer}
    <AnimatePresence>
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50"
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <motion.div
          className="flex justify-center mb-4"
          key={currentDialogue.characterId}
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 15 }}
        >
          <AnimatedCharacter
            characterId={animCharId}
            size="lg"
            isActive
            isSpeaking={isTyping}
            mood={currentDialogue.mood || "neutral"}
            showName={false}
            entrance="bounce"
            imageOverride={detectiveImageOverride}
          />
        </motion.div>

        <motion.div
          className={`mx-4 mb-4 overflow-hidden rounded-[18px] border-2 border-white/45 backdrop-blur-md bg-gradient-to-r ${colors.bg} ${colors.border} p-6 relative shadow-[0_22px_60px_rgba(0,0,0,0.42)]`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          layoutId="dialogue-box"
        >
          <motion.div
            className="flex items-center gap-3 mb-3"
            key={currentDialogue.characterId}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <h4 className={`font-bold text-lg ${colors.name}`}>
              {resolvedNames.ar}
            </h4>
            {!isDetective && (
              <span className="text-muted-foreground text-sm">
                ({resolvedNames.en})
              </span>
            )}
          </motion.div>

          <p className="text-foreground text-lg leading-relaxed" dir="rtl">
            {displayedText}
            {isTyping && (
              <motion.span
                className="inline-block w-3 h-5 bg-primary ml-1 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </p>

          {!isTyping && currentDialogue.inlineEvidence && (
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReportOpen(true);
              }}
              className="mt-3 w-full rounded-xl border border-white/70 bg-white p-3 flex items-center justify-between gap-3 text-right text-[#171717] shadow-lg shadow-black/20 transition-all hover:border-primary hover:bg-[#fff7f7] group"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              dir="rtl"
              aria-label="افتح التقرير"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex flex-col min-w-0 text-right">
                  <span className="text-[11px] text-[#666]">
                    أ. هشام سلّمك تقرير — اضغط للفتح
                  </span>
                  <span className="text-sm font-bold text-[#171717] truncate">
                    {currentDialogue.inlineEvidence.title}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary shrink-0 rotate-180 group-hover:-translate-x-1 transition-transform" />
            </motion.button>
          )}

          <AnimatePresence>
            {!isTyping && (
              <motion.div
                className="flex items-center justify-between mt-4 pt-3 border-t border-border/30 gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {currentIndex > 0 && (
                      <motion.button
                        onClick={handlePrevious}
                        initial={{ opacity: 0, scale: 0.8, x: -8 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -8 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        title="رجوع للجملة السابقة (←)"
                        className="flex items-center gap-1.5 rounded-lg border border-white/70 bg-white px-3 py-1.5 text-xs font-bold text-[#171717] transition-all hover:border-primary hover:text-primary"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>رجوع</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <span className="text-xs text-muted-foreground">
                    {currentIndex + 1} / {dialogues.length}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
};
