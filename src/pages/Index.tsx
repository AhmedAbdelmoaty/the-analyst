import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { readPFGameSnapshot, writePFGameSnapshot, clearPFGameSnapshot, type PFScreen } from "@/lib/pf-game-persistence";
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


import {
  readTimeChallenge,
  startTimeChallenge,
  clearTimeChallenge,
  checkTimeChallengeExpiry,
  submitTimeChallenge,
  subscribeTimeChallenge,
  stopAllMedia,
} from "@/lib/pf-time-challenge";
import { stopSceneAmbience } from "@/hooks/useSceneAudio";
import { TimeChallengeBar } from "@/components/game/TimeChallengeBar";
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

const GameContent = () => {
  const { resetGame, state: pfState, consumeRestartFlag } = usePFGame();

  const { user } = useAuth();
  const uid = user?.id ?? "";
  const introStorageKey = `the-analyst-brand-intro-seen:${uid}`;
  const [saved] = useState(() => readPFGameSnapshot(uid));

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return saved?.screen ?? "company-briefing";
  });

  const [showBrandIntro, setShowBrandIntro] = useState(() => {
    return !saved && !localStorage.getItem(introStorageKey);
  });

  const [transitioning, setTransitioning] = useState(false);

  // ---- Time challenge (deadline persisted per user; independent of gameStartedAt) ----
  const challengeRaw = useSyncExternalStore(
    subscribeTimeChallenge,
    () => { try { return localStorage.getItem(`pf-time-challenge-v1:${uid}`); } catch { return null; } },
  );
  const challenge = challengeRaw ? readTimeChallenge(uid) : null;
  const expired = challenge?.status === "expired";
  const expiredRef = useRef(expired);
  expiredRef.current = expired;

  useEffect(() => {
    if (challenge?.status !== "active") return;
    const check = () => {
      if (checkTimeChallengeExpiry(uid)) expiredRef.current = true;
    };
    check();
    const id = window.setTimeout(check, Math.max(0, challenge.deadline - Date.now()) + 20);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
    };
  }, [challenge?.status, challenge?.deadline, uid]);

  useEffect(() => {
    if (!expired) return;
    stopSceneAmbience();
    stopAllMedia();
    setTransitioning(false);
  }, [expired]);

  const handleSubmitReport = useCallback(() => {
    const ok = submitTimeChallenge(uid, Date.now());
    if (!ok) expiredRef.current = true;
    return ok;
  }, [uid]);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    if (expired || showBrandIntro || currentScreen === "replay-briefing" || currentScreen === "inquiry" || pfState.restartFromBeginning) return;
    writePFGameSnapshot(uid, currentScreen as PFScreen, pfState);
  }, [currentScreen, showBrandIntro, uid, pfState, expired]);

  const saveInquiryCheckpoint = useCallback(() => {
    if (expiredRef.current) return;
    writePFGameSnapshot(uid, "inquiry", pfState);
  }, [uid, pfState]);

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
  const showTimer = !showBrandIntro && challenge?.status === "active";
  const showTimeline = !showBrandIntro && !["company-briefing", "replay-briefing", "result"].includes(currentScreen);

  return (
    <div className="game-surface min-h-screen bg-background">
      <ScreenTransition isActive={transitioning} />

      {showTimeline && <ProgressTimeline currentScreen={currentScreen} />}

      {showTimer && challenge && <TimeChallengeBar deadline={challenge.deadline} />}

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
          <InquiryScreen onComplete={() => handleNavigate("reflection")} onSafeCheckpoint={saveInquiryCheckpoint} />
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
