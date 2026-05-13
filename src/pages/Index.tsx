import { useState, useEffect, useCallback } from "react";
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

  const storageKey = `pf-game-screen-guest`;

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem(storageKey) as Screen | null;
    if (saved === "replay-briefing") return "company-briefing";
    return saved || "company-briefing";
  });

  const [transitioning, setTransitioning] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    if (currentScreen !== "replay-briefing") {
      localStorage.setItem(storageKey, currentScreen);
    }
  }, [currentScreen, storageKey]);

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
    (screen: Screen, options?: { reset?: boolean; clearStorage?: boolean }) => {
      setTransitioning(true);

      setTimeout(() => {
        if (options?.reset) {
          resetGame();
          setResetVersion((version) => version + 1);
        }

        if (options?.clearStorage) {
          localStorage.removeItem(storageKey);
          localStorage.removeItem("pf-game-submitted");
        }

        setCurrentScreen(screen);

        setTimeout(() => {
          setTransitioning(false);
        }, 100);
      }, 400);
    },
    [resetGame, storageKey]
  );

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

  const showSettings = currentScreen !== "replay-briefing";
  const showTimeline = !["company-briefing", "replay-briefing", "result"].includes(currentScreen);

  return (
    <div className="min-h-screen bg-background">
      <ScreenTransition isActive={transitioning} />

      {showTimeline && <ProgressTimeline currentScreen={currentScreen} />}

      {showSettings && (
        <PlayerSettingsPanel
          onReplayBriefing={handleReplayBriefing}
          onResetProgress={handleResetProgress}
        />
      )}

      <div key={`${currentScreen}-${resetVersion}`}>
        {currentScreen === "company-briefing" && (
          <CompanyBriefingScreen onComplete={() => handleNavigate("travel")} />
        )}

        {currentScreen === "replay-briefing" && (
          <CompanyBriefingScreen
            onComplete={() => {
              const saved = localStorage.getItem(storageKey) as Screen | null;
              setCurrentScreen(saved && saved !== "replay-briefing" ? saved : "company-briefing");
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
          <EmailSendScreen onComplete={() => handleNavigate("mansour-receives")} />
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

const Index = () => (
  <PFGameProvider>
    <GameContent />
  </PFGameProvider>
);

export default Index;
