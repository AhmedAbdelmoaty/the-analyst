import { ArrowLeft, ArrowRight, Clock3, Heart, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import analystMark from "@/assets/brand/the-analyst-mark.png";
import { CASES, TUTORIAL, type Pattern } from "./data/cases";
import { BRIEFING, CASE_LINES, CHOICES, ENDING_COPY, MEETING_LINE, REACTION_LINES, RELATION_LABELS, TUTORIAL_LINES } from "./data/dialogue";
import { ScatterPlot } from "./components/ScatterPlot";
import { currentCase, initialState, reducer, ROUND_SECONDS, totalScore, type Action, type Ending, type GameState } from "./engine/gameState";
import { createRunSeed } from "./engine/datasets";
import { hasLegacyProgress, loadMeta, loadState, saveMeta, saveState, type Meta } from "./engine/persistence";
import { patternFor, pearson } from "./engine/correlation";
import { playTone } from "./engine/sound";

const patternChoices: { id: Pattern; symbol: string; label: string; detail: string }[] = [
  { id: "up", symbol: "↗", label: "علاقة طردية", detail: "بيزيدوا مع بعض" },
  { id: "down", symbol: "↘", label: "علاقة عكسية", detail: "واحد يزيد والتاني يقل" },
  { id: "none", symbol: "•••", label: "مفيش اتجاه واضح", detail: "النقط متبعثرة" },
];

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button className="btd-icon-button" type="button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function GameHeader({ state, time, paused, muted, onPause, onMute }: { state: GameState; time?: number; paused: boolean; muted: boolean; onPause: () => void; onMute: () => void }) {
  const timed = state.phase === "puzzle" || state.phase === "reveal";
  return (
    <header className="btd-hud" aria-label="حالة اللعبة">
      <div className="btd-hud-lives" aria-label={`${state.hearts} من 3 قلوب`}>
        {[0, 1, 2].map((i) => <Heart key={i} aria-hidden="true" className={i < state.hearts ? "is-alive" : "is-broken"} fill="currentColor" />)}
      </div>
        {timed && <div className="btd-hud-case">التحدي <b dir="ltr">{state.caseIndex + 1} / 3</b></div>}
      {timed && <div className={`btd-hud-clock ${time !== undefined && time <= 5 ? "is-urgent" : ""}`} aria-live="polite">
        <Clock3 aria-hidden="true" /><b dir="ltr">{time ?? "20"}</b><span>ثانية</span>
      </div>}
      <img className="btd-brand-mark" src={analystMark} alt="The Analyst" />
      <div className="btd-hud-tools">
        {timed && state.phase === "puzzle" && <IconButton label={paused ? "كمّل اللعبة" : "إيقاف مؤقت"} onClick={onPause}>{paused ? <Play /> : <Pause />}</IconButton>}
        <IconButton label={muted ? "تشغيل الصوت" : "كتم الصوت"} onClick={onMute}>{muted ? <VolumeX /> : <Volume2 />}</IconButton>
      </div>
    </header>
  );
}

type ActorName = "leila" | "glitch" | "dotty";
type ActorPose = "talk" | "worried" | "happy" | "idle" | "enter" | "stumble" | "celebrate" | "taunt";

const ACTOR_POSES: Record<ActorName, Record<ActorPose, string>> = {
  leila: { talk: "talk", worried: "worried", happy: "happy", idle: "talk", enter: "enter", stumble: "worried", celebrate: "happy", taunt: "worried" },
  glitch: { talk: "taunt", worried: "stumble", happy: "stumble", idle: "idle", enter: "enter", stumble: "stumble", celebrate: "taunt", taunt: "taunt" },
  dotty: { talk: "idle", worried: "stumble", happy: "celebrate", idle: "idle", enter: "enter", stumble: "stumble", celebrate: "celebrate", taunt: "enter" },
};

function actorPoseFor(name: ActorName, mood: string, briefingStep?: number): ActorPose {
  if (briefingStep !== undefined) {
    if (briefingStep === -1) return name === "glitch" ? "enter" : name === "leila" ? "talk" : "idle";
    if (name === "leila") return briefingStep === 3 || briefingStep === 4 ? "talk" : "worried";
    if (name === "glitch") return briefingStep === 1 ? "enter" : briefingStep === 2 ? "taunt" : "idle";
    return briefingStep === 2 ? "enter" : briefingStep === 4 ? "talk" : "idle";
  }
  if (name === "leila") return mood.startsWith("ending") || mood === "win" ? "happy" : mood === "urgent" || mood === "wrong" || mood === "timeout" ? "worried" : "talk";
  if (name === "dotty") return mood === "win" || mood === "ending-win" || mood === "ending-saved" ? "celebrate" : mood === "wrong" || mood === "timeout" || mood === "ending-glitch" ? "stumble" : mood === "urgent" ? "enter" : "idle";
  return mood === "win" || mood === "ending-win" || mood === "ending-saved" ? "stumble" : mood === "wrong" || mood === "ending-glitch" ? "taunt" : mood === "timeout" || mood === "urgent" ? "enter" : "idle";
}

function Actor({ name, state, pose, className = "" }: { name: ActorName; state: string; pose: ActorPose; className?: string }) {
  const labels = { leila: "ليلى صاحبة عربية الآيس كريم", glitch: "جليتش الشرير البنفسجي", dotty: "دوتّي صاحبة الجسم الوردي" };
  const image = state.startsWith("ending") ? `/assets/behind-dots/${name}-v5.png` : `/assets/behind-dots/v6/${name}_${ACTOR_POSES[name][pose]}.png`;
  return <div className={`btd-actor btd-actor-${name} ${className} ${state ? `act-${state}` : ""}`} data-pose={pose} aria-hidden="true"><img src={image} alt={labels[name]} draggable="false" /></div>;
}

function MarketStage({ mood = "calm", className = "", speaker, briefingStep }: { mood?: string; className?: string; speaker?: ActorName; briefingStep?: number }) {
  return (
    <div className={`btd-market-stage mood-${mood} ${className}`} data-speaker={speaker} aria-hidden="true">
      <div className="btd-market-sky" />
      <img className="btd-market-art" src="/assets/behind-dots/market-v5.png" alt="" draggable="false" />
      <div className="btd-market-clouds" />
      <div className="btd-market-awning" />
      <div className="btd-market-customers" />
      <div className="btd-market-glow" />
      <Actor name="glitch" state={briefingStep === undefined ? mood : "story"} pose={actorPoseFor("glitch", mood, briefingStep)} />
      <Actor name="dotty" state={briefingStep === undefined ? mood : "story"} pose={actorPoseFor("dotty", mood, briefingStep)} />
      <Actor name="leila" state={briefingStep === undefined ? mood : "story"} pose={actorPoseFor("leila", mood, briefingStep)} />
      <div className="btd-counter-front" />
      <div className="btd-confetti" />
      {mood === "timeout" && <div className="btd-capture-bubble">دوتّي بأمان!<span>🫧</span></div>}
    </div>
  );
}

function useCountdown(active: boolean, paused: boolean, onTimeout: () => void) {
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const callback = useRef(onTimeout);
  callback.current = onTimeout;
  useEffect(() => {
    if (!active) {
      setSeconds(ROUND_SECONDS);
      return;
    }
  }, [active]);
  useEffect(() => {
    if (!active || paused) return;
    const id = window.setInterval(() => {
      setSeconds((left) => {
        if (left <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return left - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, paused]);
  useEffect(() => { if (active && !paused && seconds === 0) callback.current(); }, [active, paused, seconds]);
  return active ? seconds : undefined;
}

function HeartsBadge({ count }: { count: number }) {
  return <span className="btd-hearts-inline" aria-label={`${count} قلوب متبقية`}>{[0, 1, 2].map((i) => <Heart key={i} aria-hidden="true" fill="currentColor" className={i < count ? "is-alive" : "is-broken"} />)}</span>;
}

function ChaseLane({ seconds, paused }: { seconds: number; paused: boolean }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setFrame((current) => (current + 1) % 4), 180);
    return () => window.clearInterval(id);
  }, [paused]);
  const progress = Math.min(1, Math.max(0, (ROUND_SECONDS - seconds) / ROUND_SECONDS));
  const frameName = String(frame + 1).padStart(2, "0");
  return <div className={`btd-chase-lane ${seconds <= 5 ? "is-urgent" : ""} ${paused ? "is-paused" : ""}`} aria-label={`جليتش يقترب من دوتّي، باقي ${seconds} ثانية`} style={{ "--chase-progress": progress } as CSSProperties}>
    <div className="btd-chase-track"><span /></div>
    <div className="btd-chase-glitch" style={{ left: `${3 + progress * 55}%` }} aria-hidden="true"><img src={`/assets/behind-dots/v6/glitch_run_${frameName}.png`} alt="" /></div>
    <div className="btd-chase-dotty" aria-hidden="true"><img src={`/assets/behind-dots/v6/dotty_run_${frameName}.png`} alt="" /></div>
    <span className="btd-chase-callout">{seconds <= 5 ? "جليتش قرب!" : "دوتّي بتجري!"}</span>
  </div>;
}

function ReactionCinema({ kind, finalLoss, onSkip }: { kind: "win" | "wrong" | "timeout"; finalLoss: boolean; onSkip: () => void }) {
  const glitchPose = kind === "win" ? "stumble" : kind === "wrong" ? "taunt" : "enter";
  const dottyPose = kind === "win" ? "celebrate" : "stumble";
  return <div className={`btd-reaction-cinema cinema-${kind} ${finalLoss ? "cinema-final-loss" : ""}`} aria-live="assertive">
    <div className="btd-cinema-speed" aria-hidden="true" />
    <div className="btd-cinema-prop" aria-hidden="true">🍦</div>
    <div className="btd-cinema-glitch" aria-hidden="true"><img src={`/assets/behind-dots/v6/glitch_${glitchPose}.png`} alt="" /></div>
    <div className="btd-cinema-dotty" aria-hidden="true"><img src={`/assets/behind-dots/v6/dotty_${dottyPose}.png`} alt="" /></div>
    {(kind === "timeout" || finalLoss) && <div className="btd-cinema-net" aria-hidden="true" />}
    <div className="btd-cinema-stamp">{finalLoss ? "انتهت الجولة!" : kind === "win" ? "صح جدًا!" : kind === "wrong" ? "جليتش قرب!" : "خلص الوقت!"}</div>
    <div className="btd-cinema-impact">{finalLoss ? "جليتش كسب الجولة" : kind === "win" ? "+3 نجوم ✦" : kind === "timeout" ? "لقطتها! 💥" : "قلب اتكسر ♡"}</div>
    <button type="button" className="btd-cinema-skip" onClick={onSkip}>كمّل ←</button>
  </div>;
}

export function BehindTheDotsGame({ userId }: { userId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [state, rawDispatch] = useReducer(reducer, initialState);
  const [meta, setMeta] = useState<Meta>({ tutorialDone: false, bestScore: 0, muted: false });
  const [legacyNotice, setLegacyNotice] = useState(false);
  const [spokenChars, setSpokenChars] = useState(0);
  const [tutorialPlacementError, setTutorialPlacementError] = useState(false);
  const [readyCase, setReadyCase] = useState<number | null>(null);
  const [reactionVisible, setReactionVisible] = useState(false);
  const [settledTime, setSettledTime] = useState(ROUND_SECONDS);
  const timeRef = useRef<number | undefined>(ROUND_SECONDS);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const storage = window.localStorage;
    setLegacyNotice(hasLegacyProgress(storage, userId));
    rawDispatch({ type: "__hydrate", s: loadState(storage, userId) });
    setMeta(loadMeta(storage, userId));
    setLoaded(true);
  }, [userId]);

  useEffect(() => { if (loaded) saveState(window.localStorage, userId, state); }, [state, loaded, userId]);
  useEffect(() => { setTutorialPlacementError(false); }, [state.phase, state.tutorialStep]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) rawDispatch({ type: "pause" }); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [state.phase, state.caseIndex]);
  useEffect(() => {
    if (state.phase !== "briefing") return;
    setSpokenChars(0);
    const length = Array.from(BRIEFING[state.briefingStep]!.text).length;
    const id = window.setInterval(() => setSpokenChars((count) => {
      if (count >= length) { window.clearInterval(id); return count; }
      return count + 1;
    }), 24);
    return () => window.clearInterval(id);
  }, [state.phase, state.briefingStep]);
  useEffect(() => {
    if (state.phase !== "puzzle") { setReadyCase(null); return; }
    setReadyCase(null);
    const id = window.setTimeout(() => setReadyCase(state.caseIndex), 700);
    return () => window.clearTimeout(id);
  }, [state.phase, state.caseIndex]);
  useEffect(() => {
    if (state.phase !== "reveal" || !reactionVisible) return;
    const result = state.results[currentCase(state).id];
    const id = window.setTimeout(() => {
      if (state.hearts === 0) dispatch({ type: "attach" });
      else setReactionVisible(false);
    }, result?.timedOut ? 2900 : 2450);
    return () => window.clearTimeout(id);
  }, [state.phase, state.caseIndex, state.results, state.hearts, reactionVisible]);
  useEffect(() => {
    if (state.completed && totalScore(state) > meta.bestScore) {
      const next = { ...meta, bestScore: totalScore(state) };
      setMeta(next);
      saveMeta(window.localStorage, userId, next);
    }
  }, [state, meta, userId]);

  const updateMeta = (update: Partial<Meta>) => setMeta((previous) => {
    const next = { ...previous, ...update };
    saveMeta(window.localStorage, userId, next);
    return next;
  });
  const dispatch = (action: Action) => {
    const before = stateRef.current;
    const after = reducer(before, action);
    if (action.type === "answer" || action.type === "timeout") {
      const result = after.phase === "reveal" ? after.results[currentCase(before).id] : undefined;
      if (result && before.phase === "puzzle") {
        setSettledTime(action.type === "timeout" ? 0 : timeRef.current ?? ROUND_SECONDS);
        setReactionVisible(true);
        playTone(result.points === 3 ? "win" : result.timedOut ? "timeout" : "heart", meta.muted);
      }
    } else if (action.type === "recommendationAnswer") {
      const choice = CHOICES.find((item) => item.id === action.choice);
      if (choice) playTone(choice.supported ? "win" : "lose", meta.muted);
    } else if (action.type === "attach") {
      playTone(before.hearts === 0 ? "lose" : "tap", meta.muted);
    } else if (action.type === "start" || action.type === "advanceBriefing" || action.type === "showTutorialDays") {
      playTone("tap", meta.muted);
    }
    if (action.type === "submitTutorial" && after.phase === "tutorialReady" && !meta.tutorialDone) updateMeta({ tutorialDone: true });
    if (action.type === "skipTutorial" && after.phase === "puzzle" && !meta.tutorialDone) updateMeta({ tutorialDone: true });
    rawDispatch(action);
  };

  const challengeReady = state.phase === "puzzle" && readyCase === state.caseIndex;
  const time = useCountdown(challengeReady, state.paused, () => dispatch({ type: "timeout" }));
  timeRef.current = time;
  if (!loaded) return <div className="btd-loading" />;

  const activeResult = state.phase === "reveal" ? state.results[currentCase(state).id] : undefined;
  const resultMood = activeResult ? activeResult.points === 3 ? "win" : activeResult.timedOut ? "timeout" : "wrong" : null;
  const shot = state.phase === "briefing" ? "dialogue" : state.phase === "tutorial" ? "notebook" : state.phase === "puzzle" ? "chart" : state.phase === "reveal" ? reactionVisible ? "reaction" : "chart" : state.phase === "debrief" ? "ending" : state.phase === "cover" ? "cover" : "plan";
  const speaker = state.phase === "briefing" ? BRIEFING[state.briefingStep]!.speaker : undefined;
  const worldMood = resultMood ?? (state.phase === "debrief" ? state.ending === "glitch" ? "ending-glitch" : state.ending === "perfect" ? "ending-win" : "ending-saved" : state.phase === "puzzle" && (time ?? ROUND_SECONDS) <= 5 ? "urgent" : state.phase === "tutorialReady" ? "win" : "calm");

  return (
    <div className={`behind-dots btd-app shot-${shot} ${state.paused ? "is-paused" : ""} ${resultMood ? `outcome-${resultMood}` : ""}`} dir="rtl" lang="ar">
      <div className="btd-app-backdrop" />
      <div className="btd-shell">
        <MarketStage mood={worldMood} speaker={speaker} briefingStep={state.phase === "cover" ? -1 : state.phase === "briefing" ? state.briefingStep : undefined} className="btd-world" />
        {(state.phase === "puzzle" || state.phase === "reveal" || state.phase === "tutorial" || state.phase === "tutorialReady" || state.phase === "recommendation") && (
          <GameHeader state={state} time={state.phase === "reveal" ? settledTime : time} paused={state.paused} muted={meta.muted} onPause={() => dispatch({ type: "pause" })} onMute={() => updateMeta({ muted: !meta.muted })} />
        )}

        {state.phase === "cover" && (
          <section className="btd-cover screen-enter">
            <div className="btd-cover-copy">
              <span className="btd-eyebrow">THE ANALYST · مغامرة تحليلية</span>
              <h1>ورا النقط</h1>
              <p className="btd-cover-tagline">أنقذ عربية ليلى</p>
              <p>ساعدها تقرأ دفتر الأيام وتختار خطة تستاهل التجربة.</p>
              {legacyNotice && <div className="btd-legacy-note" role="status">اتحدّثت قواعد اللعبة. تقدم جولتك القديمة لسه محفوظ زي ما هو؛ ابدأ جولة جديدة بالقواعد الحالية.</div>}
              <button className="btd-button btd-button-primary" onClick={() => dispatch({ type: "start", seed: createRunSeed(state.runSeed) })}>يلا نساعد ليلى! <ArrowLeft /></button>
              {meta.tutorialDone && <button className="btd-button btd-button-quiet" onClick={() => { dispatch({ type: "start", seed: createRunSeed(state.runSeed) }); window.setTimeout(() => dispatch({ type: "skipTutorial", tutorialEverDone: true }), 0); }}>ابدأ التحديات مباشرة <ArrowLeft /></button>}
              <a className="btd-return-link" href="/app"><ArrowRight /> ارجع للألعاب</a>
            </div>
          </section>
        )}

        {state.phase === "briefing" && (() => {
          const beat = BRIEFING[state.briefingStep]!;
          const finalBeat = state.briefingStep === BRIEFING.length - 1;
          const speakerName = speaker === "glitch" ? "جليتش" : speaker === "dotty" ? "دوتّي" : "ليلى";
          const portraitPose = actorPoseFor(speaker, "calm", state.briefingStep);
          const lineLength = Array.from(beat.text).length;
          const isSpeaking = spokenChars < lineLength;
          const advance = () => isSpeaking ? setSpokenChars(lineLength) : dispatch({ type: finalBeat ? "openCase" : "advanceBriefing" });
          return (
            <section className={`btd-story speaker-${speaker} screen-enter`}>
              <div className="btd-story-bubble" key={state.briefingStep}>
                <img className="btd-speaker-portrait" src={`/assets/behind-dots/v6/${speaker}_${ACTOR_POSES[speaker][portraitPose]}.png`} alt="" />
                <div className="btd-speech-copy">
                  <span className="btd-speaker-name">{speakerName} بتتكلم</span>
                  <span className="btd-eyebrow">{beat.kicker}</span>
                  <h1>{beat.title}</h1>
                  <p aria-label={beat.text}>{Array.from(beat.text).slice(0, spokenChars).join("")}{isSpeaking && <span className="btd-type-caret" aria-hidden="true" />}</p>
                </div>
              </div>
              <div className="btd-story-actions">
                <button className="btd-button btd-button-primary" onClick={advance}>{isSpeaking ? "كمّل الكلام" : finalBeat ? "افتح الدفتر" : "كمّل الحكاية"} <ArrowLeft /></button>
                <button className="btd-button btd-button-quiet" onClick={() => dispatch({ type: "skipStory" })}>تخطّي الحكاية</button>
                {meta.tutorialDone && <button className="btd-button btd-button-quiet" onClick={() => dispatch({ type: "skipTutorial", tutorialEverDone: true })}>تخطّي التدريب</button>}
              </div>
              <div className="btd-story-progress" aria-label={`مشهد ${state.briefingStep + 1} من ${BRIEFING.length}`}>{BRIEFING.map((_, i) => <span key={i} className={i <= state.briefingStep ? "is-active" : ""} />)}</div>
            </section>
          );
        })()}

        {state.phase === "tutorial" && (
          <section className="btd-tutorial screen-enter">
            <div className="btd-section-heading"><span className="btd-eyebrow">تدريب من غير وقت</span><h1>كل نقطة بتحكي يوم</h1><p>{TUTORIAL_LINES[0]}</p></div>
            <div className="btd-tutorial-sheet">
              <div className="btd-tutorial-step"><span>الخطوة {state.tutorialStep === 0 ? "1" : "2"} من 2</span><b>{state.tutorialStep === 0 ? "حطّ نقطة اليوم على الرسم" : "أظهر باقي الأيام"}</b></div>
              {state.tutorialStep === 0 && <div className="btd-tutorial-day-card"><span>من دفتر ليلى · اليوم ٦</span><b><i>عدد الزوار</i> {TUTORIAL.xs[5]} <i>الكوبايات المباعة</i> {TUTORIAL.ys[5]}</b></div>}
              <div className="btd-plot-frame btd-tutorial-plot">
                <ScatterPlot
                  xs={TUTORIAL.xs}
                  ys={TUTORIAL.ys}
                  xLabel={TUTORIAL.xLabel}
                  yLabel={TUTORIAL.yLabel}
                  highlight={state.tutorialStep === 0 ? 5 : null}
                  visiblePointIndices={state.tutorialStep === 0 ? [] : state.tutorialStep === 1 ? [5] : undefined}
                  plotTarget={state.tutorialStep === 0 ? { x: TUTORIAL.xs[5]!, y: TUTORIAL.ys[5]! } : undefined}
                  onPlotClick={state.tutorialStep === 0 ? (point) => {
                    const xTolerance = (Math.max(...TUTORIAL.xs) - Math.min(...TUTORIAL.xs)) * 0.12;
                    const yTolerance = (Math.max(...TUTORIAL.ys) - Math.min(...TUTORIAL.ys)) * 0.12;
                    if (Math.abs(point.x - TUTORIAL.xs[5]!) <= xTolerance && Math.abs(point.y - TUTORIAL.ys[5]!) <= yTolerance) {
                      setTutorialPlacementError(false);
                      dispatch({ type: "revealTutorialPoint" });
                    } else setTutorialPlacementError(true);
                  } : undefined}
                  showGuide={state.tutorialStep > 0}
                />
              </div>
              {state.tutorialStep === 0 && <>
                {tutorialPlacementError && <p className="btd-tutorial-hint" role="status">قرب النقطة من مكان اليوم ٦ في الدفتر وجرّب تاني.</p>}
                <button className="btd-button btd-button-sun btd-tutorial-action" onClick={() => { setTutorialPlacementError(false); dispatch({ type: "revealTutorialPoint" }); }}>حطّ النقطة في مكانها <ArrowLeft /></button>
              </>}
              {state.tutorialStep === 1 && <div className="btd-tutorial-coordinate" role="status">{TUTORIAL_LINES[1]} <b>الزوار: {TUTORIAL.xs[5]} · الكوبايات: {TUTORIAL.ys[5]}</b></div>}
              {state.tutorialStep === 1 && <button className="btd-button btd-button-primary btd-tutorial-action" onClick={() => dispatch({ type: "showTutorialDays" })}>أظهر باقي الأيام <ArrowLeft /></button>}
              {state.tutorialStep === 2 && <>
                <p className="btd-tutorial-question">{TUTORIAL_LINES[2]}</p>
                <div className="btd-pattern-options btd-tutorial-options">
                  {patternChoices.map((choice) => <button key={choice.id} type="button" className={`btd-pattern-button ${state.tutorialGuess === choice.id ? "is-selected" : ""}`} aria-pressed={state.tutorialGuess === choice.id} onClick={() => dispatch({ type: "setGuess", value: choice.id })}><span className="btd-pattern-symbol">{choice.symbol}</span><span><strong>{choice.label}</strong><small>{choice.detail}</small></span></button>)}
                </div>
                {state.tutorialAttempts > 0 && <p className="btd-tutorial-hint" role="status">بص للنقط كلها مع بعض، مش لنقطة واحدة. المحاولة دي من غير خصم قلوب.</p>}
                <button className="btd-button btd-button-primary btd-tutorial-action" disabled={!state.tutorialGuess} onClick={() => dispatch({ type: "submitTutorial" })}>{state.tutorialAttempts > 0 ? "جرّب تاني" : "ابدأ التحديات"} <ArrowLeft /></button>
                {meta.tutorialDone && <button className="btd-button btd-button-quiet" onClick={() => dispatch({ type: "skipTutorial", tutorialEverDone: true })}>تخطّي التدريب</button>}
              </>}
            </div>
          </section>
        )}

        {state.phase === "tutorialReady" && (
          <section className="btd-ready screen-enter">
            <div className="btd-ready-card">
              <span className="btd-eyebrow">الدفتر اتفتح · التدريب من غير وقت</span>
              <h1>{state.tutorialAttempts > 1 ? "دلوقتي عرفنا الاتجاه" : "بالضبط!"}</h1>
              <p>{state.tutorialAttempts > 1 ? `النقط طالعة لفوق: ${RELATION_LABELS.up}. دلوقتي نقرأ الحالات التلاتة براحتنا.` : "المهم الاتجاه العام، مش إن كل نقطة تبقى على نفس الخط."}</p>
              <div className="btd-ready-rules"><HeartsBadge count={3} /><span>٣ قلوب</span><i /><Clock3 /><span>٢٠ ثانية لكل تحدي</span></div>
              <p>جليتش: «تقدر تلحق دوتّي قبل ما أوصلها؟»</p>
              <button className="btd-button btd-button-primary" onClick={() => dispatch({ type: "startChallenges" })}>ابدأ التحديات <ArrowLeft /></button>
            </div>
          </section>
        )}

        {(state.phase === "puzzle" || state.phase === "reveal") && (() => {
          const storyCase = currentCase(state);
          const result = state.phase === "reveal" ? state.results[storyCase.id] : undefined;
          const mood = result ? (result.points === 3 ? "win" : result.timedOut ? "timeout" : "wrong") : time !== undefined && time <= 5 ? "urgent" : "calm";
          return (
            <section className={`btd-challenge screen-enter ${result ? `is-${mood}` : ""}`}>
              <div className="btd-challenge-content">
                <div className="btd-case-heading"><span className="btd-eyebrow">صفحة {state.caseIndex + 1} من 3 · {storyCase.title}</span>{!result && <p>{CASE_LINES[storyCase.id]}</p>}</div>
                <div className="btd-chart-sheet" key={`page-${state.caseIndex}`}>
                  <div className="btd-sheet-topline"><span className="btd-sticker">دفتر ليلى</span><span className="btd-chart-label">Scatter Plot</span></div>
                  <div className="btd-plot-frame btd-main-plot">
                    <ScatterPlot xs={storyCase.xs} ys={storyCase.ys} xLabel={storyCase.xLabel} yLabel={storyCase.yLabel} showFit={Boolean(result && result.actual !== "none")} />
                  </div>
                  <div className="btd-challenge-side">
                    <h1 className="btd-case-question">{storyCase.question}</h1>
                    {result ? (
                      <div className={`btd-result-reaction reaction-${mood}`} aria-live="polite">
                        <div className="btd-reaction-stamp">{result.timedOut ? "خلص الوقت!" : result.points === 3 ? "صح جدًا!" : "الاختيار اتقفل"}</div>
                        <p>{REACTION_LINES[storyCase.id][result.timedOut ? "timeout" : result.points === 3 ? "win" : "wrong"]}</p>
                        <div className="btd-reaction-footer"><strong className="btd-relation-reveal">{RELATION_LABELS[result.actual]}</strong><HeartsBadge count={state.hearts} />{result.points === 3 && <b className="btd-score-pop">+3</b>}</div>
                        <button className="btd-button btd-button-primary btd-next-button" onClick={() => dispatch({ type: "attach" })}>{state.caseIndex === 2 ? "ساعد ليلى تختار خطة بكرة" : "اقلب الصفحة"} <ArrowLeft /></button>
                      </div>
                    ) : (
                      <div className="btd-pattern-options" aria-label="اختار اتجاه العلاقة">
                        {patternChoices.map((choice) => <button key={choice.id} type="button" className="btd-pattern-button" disabled={!challengeReady} onClick={() => dispatch({ type: "answer", value: choice.id })}><span className="btd-pattern-symbol">{choice.symbol}</span><span><strong>{choice.label}</strong></span></button>)}
                      </div>
                    )}
                  </div>
                </div>
                {result && reactionVisible && <ReactionCinema kind={mood as "win" | "wrong" | "timeout"} finalLoss={state.hearts === 0} onSkip={() => state.hearts === 0 ? dispatch({ type: "attach" }) : setReactionVisible(false)} />}
                {state.phase === "puzzle" && <ChaseLane seconds={time ?? ROUND_SECONDS} paused={state.paused} />}
              </div>
            </section>
          );
        })()}

        {state.phase === "recommendation" && (
          <section className="btd-recommendation screen-enter">
            <div className="btd-recommend-card">
              <span className="btd-eyebrow">دفتر ليلى · خطوة واحدة أخيرة</span>
              <h1>خطة بكرة</h1>
              <div className="btd-plan-speech"><img src="/assets/behind-dots/leila-v5.png" alt="" /><p className="btd-recommend-intro"><b>ليلى بتسأل مرة واحدة</b> {MEETING_LINE}</p></div>
              <div className="btd-evidence-strip" aria-label="ملخص العلاقات">
                {state.evidence.map((id) => {
                  const c = CASES.find((item) => item.id === id)!;
                  const trend = state.results[id]?.actual;
                  return <div className="btd-evidence-chip" key={id}><b>{c.title}</b><span>{trend ? RELATION_LABELS[trend] : ""}</span></div>;
                })}
              </div>
              <h2>أنهي خطة أنسب نبدأ نجربها بناءً على البيانات اللي شفناها؟</h2>
              <div className="btd-recommend-once">اختيار واحد بس · ركّز في الدليل وخد قرارك</div>
              <div className="btd-recommend-options">
                {CHOICES.map((choice) => <button type="button" key={choice.id} onClick={() => dispatch({ type: "recommendationAnswer", choice: choice.id })} className="btd-recommend-option"><span>{choice.id}</span>{choice.text}<ArrowLeft /></button>)}
              </div>
            </div>
          </section>
        )}

        {state.phase === "debrief" && state.ending && <Results state={state} onReplay={() => dispatch({ type: "replay" })} />}

        {state.paused && <div className="btd-pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title"><div className="btd-pause-card"><span className="btd-eyebrow">وقفة صغيرة</span><h2 id="pause-title">دوتّي مستنية</h2><p>الوقت وقف. كل حاجة محفوظة.</p><button className="btd-button btd-button-primary" onClick={() => dispatch({ type: "resume" })}><Play /> كمّل اللعب</button></div></div>}
      </div>
    </div>
  );
}

function Results({ state, onReplay }: { state: GameState; onReplay: () => void }) {
  const navigate = useNavigate();
  const ending: Ending = state.ending ?? "glitch";
  const copy = ENDING_COPY[ending];
  const correctCount = Object.values(state.results).filter((result) => result?.points === 3).length;
  const recommendation = CHOICES.find((choice) => choice.id === state.recommendationAttempts[0]);
  return (
    <section className={`btd-results screen-enter ending-${ending}`}>
      <div className="btd-results-card">
        <span className="btd-eyebrow">{ending === "perfect" ? "٣ نجوم · جولة كاملة" : ending === "saved" ? "فوز · دوتّي نجت" : "انتهت الجولة · جليتش كسب"}</span>
        <h1>{copy.title}</h1>
        <p>{copy.line}</p>
        <div className="btd-ending-medals" role="img" aria-label={`${correctCount} نجوم من 3 لإجابات الشارت`}>
          {[0, 1, 2].map((star) => <span key={star} className={star < correctCount ? "is-earned" : ""} style={{ "--medal-order": star } as CSSProperties}>★</span>)}
          <small>{correctCount} من 3 إجابات صح</small>
        </div>
        <div className="btd-results-score"><strong>{totalScore(state)}<small>/ 9</small></strong><span>النقاط</span><HeartsBadge count={state.hearts} /></div>
        <div className="btd-results-dialogue"><img src="/assets/behind-dots/glitch-v5.png" alt="" /><span>جليتش:</span> {copy.glitch}</div>
        <div className="btd-ending-choice"><b>التوصية النهائية</b><p>{recommendation ? <>{recommendation.supported ? "اختيار مدعوم: " : "اختيار غير مدعوم: "}{recommendation.text}</> : "انتهت القلوب قبل ما ليلى تختار التوصية."}</p></div>
        <div className="btd-results-relations">{state.evidence.map((id) => {
          const c = CASES.find((item) => item.id === id)!;
          return <div key={id}><b>{c.title}</b><span>{state.results[id] ? RELATION_LABELS[state.results[id]!.actual] : ""}</span></div>;
        })}</div>
        <p className="btd-causality-note">النقط بتوضح ارتباط في الأيام اللي سجلناها؛ التجربة والقياس يساعدوا نعرف أكتر.</p>
        <div className="btd-results-actions"><button className="btd-button btd-button-primary" onClick={onReplay}><RotateCcw /> العب مرة تانية</button><button className="btd-button btd-button-quiet" onClick={() => navigate("/app")}>ارجع للألعاب <ArrowRight /></button></div>
      </div>
    </section>
  );
}
