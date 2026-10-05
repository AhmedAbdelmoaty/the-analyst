import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { readPFGameSnapshot, writePFGameSnapshot, clearPFGameSnapshot, setSaveWritable, setSceneScope, type PFScreen } from "@/lib/pf-game-persistence";
import { CompanyBriefingScreen } from "@/components/game/screens/CompanyBriefingScreen";
import { TravelScreen } from "@/components/game/screens/TravelScreen";
import { VelaroStreetScreen } from "@/components/game/screens/VelaroStreetScreen";
import { ArrivalScreen } from "@/components/game/screens/ArrivalScreen";
import { InquiryScreen } from "@/components/game/screens/InquiryScreen";
import { FramingScreen } from "@/components/game/screens/FramingScreen";
import { ReflectionTransition } from "@/components/game/screens/ReflectionTransition";

import { EmailSendScreen } from "@/components/game/screens/EmailSendScreen";
import { MansourReceivesEmailScreen } from "@/components/game/screens/MansourReceivesEmailScreen";
import { IncomingCallScreen } from "@/components/game/screens/IncomingCallScreen";
import { PhoneCallDebriefScreen } from "@/components/game/screens/PhoneCallDebriefScreen";
import { ResultScreen } from "@/components/game/screens/ResultScreen";

import { pauseGame, resumeGame, isGamePaused, subscribePause, discardPausedWork, nativeSetTimeout, nativeClearTimeout, nativeSetInterval, nativeClearInterval } from "@/lib/pf-pause";
import {
  readTimeChallenge,
  startTimeChallenge,
  clearTimeChallenge,
  checkTimeChallengeExpiry,
  submitTimeChallenge,
  subscribeTimeChallenge,
  stopAllMedia,
  challengeStorageKey,
  pauseTimeChallenge,
  resumeTimeChallenge,
  heartbeatTimeChallenge,
  freezeAfterReload,
  adoptLegacyRound,
  remainingMs,
} from "@/lib/pf-time-challenge";
import { claimRound, releaseRound } from "@/lib/pf-round-owner";
import { isUpdatePending, subscribeUpdate, applyPendingUpdate } from "@/lib/registerAppWorker";
import { stopSceneAmbience } from "@/hooks/useSceneAudio";
import { TimeChallengeBar } from "@/components/game/TimeChallengeBar";
import { PauseOverlay } from "@/components/game/PauseOverlay";
import { TimeUpScreen } from "@/components/game/screens/TimeUpScreen";
import { AnalystBrandIntroScreen } from "@/components/game/AnalystBrandIntroScreen";
import { PlayerSettingsPanel } from "@/components/game/PlayerSettingsPanel";
import { PFGameProvider, usePFGame } from "@/contexts/PFGameContext";
import { ScreenTransition } from "@/components/game/ScreenTransition";
import { ProgressTimeline } from "@/components/game/ProgressTimeline";
import { SCREEN_ASSETS, getNextScreen } from "@/lib/pf-case/asset-manifest";
import { preloadImage, preloadAudio, runWithConcurrency } from "@/lib/assetPreloader";

type Screen =
  | "company-briefing"
  | "travel"
  | "velaro-street"
  | "arrival"
  | "inquiry"
  | "reflection"
  | "framing"
  | "email-send"
  | "mansour-receives"
  | "incoming-call"
  | "phone-call"
  | "result"
  | "replay-briefing";

/** Reads the saved round once per mount, reconciling it with the time challenge. */
function bootRound(uid: string) {
  freezeAfterReload(uid);
  const saved = readPFGameSnapshot(uid);
  let challenge = readTimeChallenge(uid);
  if (saved && !challenge && !saved.gameState.framingSubmitted) challenge = adoptLegacyRound(uid);
  const resumable = !!saved && saved.screen !== "result";
  // Restored rounds wait for "متابعة اللعب" — nothing plays before the player's tap.
  if (resumable) { pauseGame(); pauseTimeChallenge(uid); }
  return { saved, resumable };
}

const GameContent = () => {
  const { resetGame, state: pfState, consumeRestartFlag } = usePFGame();

  const { user } = useAuth();
  const uid = user?.id ?? "";
  const introStorageKey = `the-analyst-brand-intro-seen:${uid}`;
  const [{ saved }] = useState(() => bootRound(uid));

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return saved?.screen ?? "company-briefing";
  });

  // Every new round starts from the cover's «ابدأ الآن», which starts the timer.
  const [showBrandIntro, setShowBrandIntro] = useState(() => !saved);

  const [transitioning, setTransitioning] = useState(false);

  // ---- Time challenge (active-play clock persisted per user) ----
  const challengeRaw = useSyncExternalStore(
    subscribeTimeChallenge,
    () => { try { return localStorage.getItem(challengeStorageKey(uid)); } catch { return null; } },
  );
  const challenge = challengeRaw ? readTimeChallenge(uid) : null;
  const expired = challenge?.status === "expired";
  const expiredRef = useRef(expired);
  expiredRef.current = expired;
  const running = challenge?.status === "active" && challenge.runningSince != null;

  // Scope per-screen progress to this round + screen before children render.
  setSceneScope(uid, `${challenge?.roundId ?? "legacy"}|${currentScreen}`);

  const paused = useSyncExternalStore(subscribePause, isGamePaused);
  const updatePending = useSyncExternalStore(subscribeUpdate, isUpdatePending);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!running || !challenge) return;
    const check = () => {
      if (checkTimeChallengeExpiry(uid)) expiredRef.current = true;
    };
    check();
    const id = nativeSetTimeout(check, remainingMs(challenge) + 20);
    const beat = nativeSetInterval(() => heartbeatTimeChallenge(uid), 1000);
    return () => { nativeClearTimeout(id); nativeClearInterval(beat); };
  }, [running, challenge?.runningSince, challenge?.remainingMs, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!expired) return;
    discardPausedWork();
    resumeGame();
    stopSceneAmbience();
    stopAllMedia();
    setTransitioning(false);
  }, [expired]);

  // Screen to persist: a confirmed report or an accepted send resumes at the next step.
  const effectiveScreen = useCallback((screen: Screen, state: typeof pfState): PFScreen => {
    if (screen === "framing" && state.framingSubmitted) return "email-send";
    if (screen === "email-send" && readTimeChallenge(uid)?.status === "submitted") return "mansour-receives";
    return screen as PFScreen;
  }, [uid]);

  const latest = useRef({ currentScreen, pfState, showBrandIntro, expired });
  latest.current = { currentScreen, pfState, showBrandIntro, expired };

  const saveNow = useCallback(() => {
    const l = latest.current;
    if (l.expired || l.showBrandIntro || l.currentScreen === "replay-briefing" || l.pfState.restartFromBeginning) return;
    writePFGameSnapshot(uid, effectiveScreen(l.currentScreen, l.pfState), l.pfState, readTimeChallenge(uid)?.roundId);
  }, [uid, effectiveScreen]);

  const handleSubmitReport = useCallback(() => {
    const ok = submitTimeChallenge(uid, Date.now());
    if (!ok) { expiredRef.current = true; return false; }
    // Persist the accepted send immediately so a reload continues past the email.
    writePFGameSnapshot(uid, "mansour-receives", latest.current.pfState, readTimeChallenge(uid)?.roundId);
    return true;
  }, [uid]);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => { saveNow(); }, [currentScreen, showBrandIntro, pfState, expired, saveNow]);

  // ---- Pause: page hidden, app switched, screen locked, route left ----
  const pausable = !showBrandIntro && !expired && currentScreen !== "result";
  const pausableRef = useRef(pausable);
  pausableRef.current = pausable;

  const doPause = useCallback(() => {
    saveNow();
    if (!pausableRef.current) return;
    pauseGame();
    pauseTimeChallenge(uid);
  }, [saveNow, uid]);

  useEffect(() => {
    const onLost = () => {
      saveNow();
      setSaveWritable(false);
      setStale(true);
      pauseGame();
      pauseTimeChallenge(uid);
    };
    setSaveWritable(true);
    claimRound(uid, onLost);
    const onVis = () => { if (document.visibilityState === "hidden") doPause(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", doPause);
    document.addEventListener("freeze", doPause);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", doPause);
      document.removeEventListener("freeze", doPause);
      // Leaving /play (or signing out): save, freeze the clock, silence everything.
      saveNow();
      pauseTimeChallenge(uid);
      discardPausedWork();
      stopSceneAmbience();
      stopAllMedia();
      resumeGame();
      releaseRound();
      setSaveWritable(true);
    };
  }, [uid, doPause, saveNow]);

  const handleContinue = useCallback(() => {
    if (stale) { window.location.reload(); return; }
    claimRound(uid, () => { setSaveWritable(false); setStale(true); pauseGame(); pauseTimeChallenge(uid); });
    resumeTimeChallenge(uid);
    resumeGame();
  }, [stale, uid]);

  const handleUpdateNow = useCallback(() => {
    saveNow();
    applyPendingUpdate();
  }, [saveNow]);

  // Just-in-time prefetch: while the player is on the current screen,
  // start downloading the next screen's images and audio so transitions
  // never show half-loaded media.
  useEffect(() => {
    if (currentScreen === "replay-briefing") return;
    const next = getNextScreen(currentScreen as keyof typeof SCREEN_ASSETS);
    if (!next) return;
    const group = SCREEN_ASSETS[next];
    if (!group) return;
    const tasks = [
      ...group.images.map((src) => () => preloadImage(src, 6000)),
      ...group.audio.map((src) => () => preloadAudio(src, 6000)),
    ];
    runWithConcurrency(tasks, 4);
  }, [currentScreen]);

  // Handle "restart from beginning" — navigate back to store-arrival scene
  useEffect(() => {
    if (pfState.restartFromBeginning) {
      consumeRestartFlag();
      setTransitioning(true);
      setTimeout(() => {
        setCurrentScreen("arrival");
        setTimeout(() => setTransitioning(false), 100);
      }, 400);
    }
  }, [pfState.restartFromBeginning, consumeRestartFlag]);

  const navigateWithTransition = useCallback(
    (screen: Screen, options?: { reset?: boolean; clearStorage?: boolean; fromTimeUp?: boolean }) => {
      if (expiredRef.current && !options?.fromTimeUp) return;
      setTransitioning(true);

      setTimeout(() => {
        if (expiredRef.current && !options?.fromTimeUp) return;
        if (options?.reset) {
          resetGame();
          setResetVersion((version) => version + 1);
        }

        if (options?.clearStorage) {
          clearPFGameSnapshot(uid);
          localStorage.removeItem(`pf-game-submitted:${uid}`);
          localStorage.removeItem(introStorageKey);
          clearTimeChallenge(uid);
        }

        setCurrentScreen(screen);
        if (screen === "company-briefing" && options?.clearStorage) {
          setShowBrandIntro(true);
        }

        setTimeout(() => {
          setTransitioning(false);
        }, 100);
      }, 400);
    },
    [introStorageKey, resetGame, uid]
  );

  const handleBrandIntroComplete = useCallback(() => {
    localStorage.setItem(introStorageKey, "1");
    startTimeChallenge(uid);
    setShowBrandIntro(false);
  }, [introStorageKey, uid]);

  const handleTimeUpRetry = useCallback(() => {
    resetGame();
    setResetVersion((v) => v + 1);
    clearPFGameSnapshot(uid);
    localStorage.removeItem(`pf-game-submitted:${uid}`);
    localStorage.setItem(introStorageKey, "1");
    setShowBrandIntro(false);
    setCurrentScreen("company-briefing");
    startTimeChallenge(uid);
  }, [introStorageKey, resetGame, uid]);

  const handleTimeUpBack = useCallback(() => {
    resetGame();
    setResetVersion((v) => v + 1);
    clearPFGameSnapshot(uid);
    localStorage.removeItem(`pf-game-submitted:${uid}`);
    localStorage.removeItem(introStorageKey);
    setCurrentScreen("company-briefing");
    setShowBrandIntro(true);
    clearTimeChallenge(uid);
  }, [introStorageKey, resetGame, uid]);

  const handleNavigate = useCallback(
    (screen: string) => {
      if (screen === "company-briefing") {
        navigateWithTransition("company-briefing", {
          reset: true,
          clearStorage: true,
        });
        return;
      }

      navigateWithTransition(screen as Screen);
    },
    [navigateWithTransition]
  );

  const handleReplayBriefing = useCallback(() => {
    setCurrentScreen("replay-briefing");
  }, []);

  const handleResetProgress = useCallback(() => {
    navigateWithTransition("company-briefing", {
      reset: true,
      clearStorage: true,
    });
  }, [navigateWithTransition]);

  if (expired) {
    return (
      <div className="game-surface min-h-screen bg-background">
        <TimeUpScreen onRetry={handleTimeUpRetry} onBackToStart={handleTimeUpBack} />
      </div>
    );
  }

  const showSettings = currentScreen !== "replay-briefing" && !showBrandIntro;
  const showTimer = !showBrandIntro && challenge?.status === "active" && currentScreen !== "replay-briefing";
  const showTimeline = !showBrandIntro && !["company-briefing", "replay-briefing", "result"].includes(currentScreen);

  return (
    <div className="game-surface min-h-screen bg-background">
      <ScreenTransition isActive={transitioning} />

      {showTimeline && <ProgressTimeline currentScreen={currentScreen} />}

      {showTimer && challenge && <TimeChallengeBar challenge={challenge} belowTimeline={showTimeline} />}

      {(paused || stale) && pausable && (
        <PauseOverlay onContinue={handleContinue} updatePending={updatePending && !stale} onUpdate={handleUpdateNow} />
      )}

      {showSettings && (
        <PlayerSettingsPanel
          onReplayBriefing={handleReplayBriefing}
          onResetProgress={handleResetProgress}
        />
      )}

      <div key={`${currentScreen}-${resetVersion}`}>
        {showBrandIntro && currentScreen === "company-briefing" && (
          <AnalystBrandIntroScreen onComplete={handleBrandIntroComplete} />
        )}

        {!showBrandIntro && currentScreen === "company-briefing" && (
          <CompanyBriefingScreen onComplete={() => handleNavigate("travel")} />
        )}

        {currentScreen === "replay-briefing" && (
          <CompanyBriefingScreen
            onComplete={() => {
              const previous = readPFGameSnapshot(uid);
              setCurrentScreen(previous?.screen ?? "company-briefing");
            }}
            isReviewMode
          />
        )}

        {currentScreen === "travel" && (
          <TravelScreen onComplete={() => handleNavigate("velaro-street")} />
        )}

        {currentScreen === "velaro-street" && (
          <VelaroStreetScreen onComplete={() => handleNavigate("arrival")} />
        )}

        {currentScreen === "arrival" && (
          <ArrivalScreen onComplete={() => handleNavigate("inquiry")} />
        )}

        {currentScreen === "inquiry" && (
          <InquiryScreen onComplete={() => handleNavigate("reflection")} />
        )}

        {currentScreen === "reflection" && (
          <ReflectionTransition onComplete={() => handleNavigate("framing")} />
        )}

        {currentScreen === "framing" && (
          <FramingScreen onComplete={() => handleNavigate("email-send")} />
        )}

        {currentScreen === "email-send" && (
          <EmailSendScreen onComplete={() => handleNavigate("mansour-receives")} onSubmitReport={handleSubmitReport} />
        )}

        {currentScreen === "mansour-receives" && (
          <MansourReceivesEmailScreen onComplete={() => handleNavigate("incoming-call")} />
        )}

        {currentScreen === "incoming-call" && (
          <IncomingCallScreen onAnswer={() => handleNavigate("phone-call")} />
        )}

        {currentScreen === "phone-call" && (
          <PhoneCallDebriefScreen onComplete={() => handleNavigate("result")} />
        )}

        {currentScreen === "result" && (
          <ResultScreen onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  );
};

const Index = () => {
  const {user} = useAuth();
  if (!user) return null;
  return <PFGameProvider key={user.id} userId={user.id}><GameContent key={user.id} /></PFGameProvider>;
};

export default Index;
