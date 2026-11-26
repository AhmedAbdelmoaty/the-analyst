import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronLeft, DoorOpen, Home, Pause, Mail, Phone, RotateCcw, Send, Volume2, VolumeX } from "lucide-react";
import { CinematicScene } from "./CinematicScene";
import { PRELOAD_GROUPS, preloadAll, type CineKey } from "./cinematic";
import { DATA_PREPARATION_SECONDS, claimsFor, initialState, isCorrect, reduce, type Action, type EvidenceId, type State } from "./engine";
import { SAYES_ASK, SAYES_CHOICES, SAYES_NAME, SAYES_PARK, SAYES_POPUP, type SayesPose, BRIEF, CLAIM_LABELS, CONFIRM_PAIR, emailBody, GUESSES, MEETING, METRICS, METRICS_LIST, QUESTIONS, SAYES_LOSS_CALL, BOOTH_MESSAGE, THOUGHTS, TITLE, WIN, VOICE_DURATIONS, type Line, type Metric, type Speaker } from "./content";
import { PORTRAITS, SAYES_ART, SCENES, type SceneKey } from "./assets";
import { DashChart, InlineReportCard, OfficialReportModal } from "./Chart";
import { getCurrentVoice, pauseAudio, resumeAudio, playVoice, setMuted, sfx, startBgm, startStreetAmbience, stopStreetAmbience, stopVoice, whoosh } from "./audio";
import engageLogo from "./assets/engage-logo.jpeg";
import * as Dialog from "@radix-ui/react-dialog";
import { GameButton } from "./GameButton";
import { GameOptions, SettingsButton } from "./GameOptions";
import { IncomingCall } from "./IncomingCall";
import { NarrativeLine, SceneGate, preloadVoices } from "./Narrative";
import "./game.css";
import { RunProvider, useActiveTimer, useRuntime, useSavedState } from "./runtime";
import { useNavigate } from "react-router-dom";

const WHO: Record<Speaker, { name: string; role: string; tone: "dark" | "light" }> = {
  tarek: { name: "أ. طارق", role: "مدير التدريب والتطوير", tone: "dark" },
  seif: { name: "مستر سيف", role: "المدير العام", tone: "light" },
  player: { name: "أنت", role: "محلل الـ HR", tone: "light" },
};

const STATION: Record<State["phase"], string> = { intro: "", brief: "مكتب المدير العام", road: "الطريق لمكتب التدريب", meeting: "مكتب التدريب", office: "مكتب التحليل", verdict: "القرار النهائي" };
type GameProps = { userId: string; completionSaved?: boolean; onSubmit?: (s: State) => void; onStart?: () => void; onDone?: () => void; onCallEnd?: () => void; endActions?: ReactNode };
export default function Game(props: GameProps) {
  return <RunProvider key={props.userId} userId={props.userId}><GameSession {...props} /></RunProvider>;
}
function GameSession(props: GameProps) {
  const { revision } = useRuntime();
  return <ActiveGame key={revision} {...props} />;
}
function ActiveGame({ onSubmit, onStart, onDone, onCallEnd, endActions, completionSaved = true }: GameProps) {
  const { run, dispatch, paused, pause, resume, finish, exitPrompt, unavailable, otherTab, restart } = useRuntime();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => { setSettingsOpen(true); pause(); };
  const state = run.state;
  const navigate = useNavigate();
  const [muted, setMute] = useSavedState("global:muted", false);
  const [fade, setFade] = useState(false);
  const [roadStep, setRoadStep] = useSavedState<RoadStep>("roadStep", "drive");
  const [roadWhistlePlayed, setRoadWhistlePlayed] = useSavedState("roadWhistlePlayed", false);
  const markRoadWhistle = useCallback(() => setRoadWhistlePlayed(true), [setRoadWhistlePlayed]);
  const [sayesShown, setSayesShown] = useSavedState("global:sayesShown", false);
  const [pending, setPending] = useSavedState<Action | null>("pendingTravel", null);
  const [briefComplete, setBriefComplete] = useSavedState("briefComplete", false);
  const travelLock = useRef(false);
  const sendRecommendation = useCallback(() => dispatch({ type: "send" }), [dispatch]);
  useEffect(() => { setMuted(muted); }, [muted]);
  useEffect(() => {
    if (state.phase === "road") startStreetAmbience(); else stopStreetAmbience();
    return () => stopStreetAmbience();
  }, [state.phase]);
  const travel = useCallback((a: Action) => { if (travelLock.current || paused) return; travelLock.current = true; stopVoice(); setFade(true); setPending(a); }, [setPending, paused]);
  useActiveTimer(`travel:${state.phase}:${state.line}`, 420, () => { setPending(null); dispatch(pending ?? { type: "next" }); setFade(false); travelLock.current = false; }, Boolean(pending));
  const submittedRef = useRef(false);
  useEffect(() => { if (!paused && state.phase === "verdict" && onSubmit && !submittedRef.current) { submittedRef.current = true; onSubmit(state); } }, [state, onSubmit, paused]);
  const timerOn = state.phase === "office" && state.officeEntered;
  const timerVisible = state.officeEntered && (state.phase === "office" || state.phase === "verdict");
  useActiveTimer("analysis", ANALYSIS_MS, () => dispatch({ type: "timeout" }), timerOn);
  const elapsed = Math.max(0, Math.ceil((ANALYSIS_MS - (run.timers.analysis ?? 0)) / 1000));
  const driveLeft = useActiveTimer("drive", 7600, () => setRoadStep("park"), state.phase === "road" && roadStep === "drive");
  const parkLeft = useActiveTimer("park", 1600, () => {}, state.phase === "road" && roadStep === "park");
  const travelBeat = roadStep === "drive" ? Number(driveLeft <= 5000) : Number(parkLeft === 0);
  const exit = useCallback(() => { pause(); navigate("/app"); }, [pause, navigate]);
  const done = useCallback(() => { if (completionSaved) finish(); else pause(); onDone?.(); }, [finish, onDone, completionSaved, pause]);
  // Add one same-route guard while playing; browser Back pauses instead of discarding progress.
  useEffect(() => {
    if (state.phase === "intro") return;
    const marker = "trainingBackGuard";
    const existing = window.history.state ?? {};
    if (!existing[marker]) window.history.pushState({ ...existing, [marker]: true }, "", window.location.href);
    const back = () => { window.history.pushState({ ...(window.history.state ?? {}), [marker]: true }, "", window.location.href); pause(true); };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [state.phase === "intro", pause]);
  useEffect(() => { preloadAll(PRELOAD_GROUPS.start); preloadVoices([...BRIEF, ...MEETING, ...WIN.lines].flatMap(l => l.voice ? [l.voice] : []).concat(["sayes-park.wav", "sayes-ask.wav"], SAYES_CHOICES.map(c => c.voice), Object.values(SAYES_LOSS_CALL).flatMap(lines => lines.map(l => l.voice)))); }, []);
  useEffect(() => { if (state.phase === "brief" || state.phase === "road") preloadAll(PRELOAD_GROUPS.road); if (state.phase === "meeting") preloadAll(PRELOAD_GROUPS.meeting); if (state.phase === "office") { preloadAll(PRELOAD_GROUPS.office); preloadAll(PRELOAD_GROUPS.endings); } }, [state.phase]);
  const cine: CineKey | null = state.phase === "intro" ? null
    : state.phase === "brief" ? "briefing"
    : state.phase === "road" ? (roadStep === "drive" ? (travelBeat ? "driving" : "enterCar") : roadStep === "park" ? (travelBeat ? "parkingDone" : "parkingProgress") : roadStep === "ask" || !state.sayes ? "paymentRequest" : state.sayes === "later" ? "payLater" : state.sayes === "ten" ? "payTen" : "payFifty")
    : state.phase === "meeting" ? (state.line < 2 ? "tarekWelcome" : "tarekReport")
    : state.phase === "office" ? (!state.officeEntered ? "officeEntry" : state.view === "think" ? "thinking" : state.view === "guess" || state.view === "ask" ? "investigation" : state.view === "email" ? "sending" : "dashboard")
    : state.timedOut ? "timeout" : state.outcome === "win" ? "victory" : "failure";
  const scene: SceneKey = "cover";

  return (
    <div className={`g600 g-training-eval ${paused ? "is-paused" : ""}`} dir="rtl">
      <div className="g-play-layer" {...(paused ? { inert: "" } : {})} aria-hidden={paused || undefined}>
      {cine ? <CinematicScene k={cine} zoom={state.phase === "brief" && state.line > 0} /> : <Scene k={scene} />}
      {cine === "briefing" && <motion.figure className="g-engage-scene-logo" initial={{ opacity: 0, y: -12, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .45, ease: "easeOut" }}><img src={engageLogo} alt="Engage for Better Performance" /></motion.figure>}
      {state.phase === "intro" && <SettingsButton className="te-offer-settings" onClick={openSettings} />}
      {state.phase !== "intro" && <Hud state={state} muted={muted} elapsed={elapsed} timerVisible={timerVisible} onMute={() => setMute((v) => !v)} onSettings={openSettings} onThink={() => { if (state.phase === "office" && state.officeEntered) dispatch({ type: "backToThink" }); }} />}
      <AnimatePresence mode="wait">
        <motion.main key={`${state.phase}-${state.view}`} className="g-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}>
          {state.phase === "intro" && <Cover go={() => { resumeAudio(); startBgm(); sfx.tap(); travel({ type: "start" }); onStart?.(); }} />}
          {state.phase === "brief" && (briefComplete ? <SceneGate label="روح لمكتب التدريب" onGo={() => travel({ type: "next", phase: "brief", line: state.line })} /> : <Dialogue line={BRIEF[state.line] ?? BRIEF[0] ?? { who: "seif", text: "" }} index={state.line} total={BRIEF.length} onPrevious={state.line > 0 ? () => dispatch({ type: "previous", phase: "brief", line: state.line }) : undefined} onNext={() => state.line + 1 < BRIEF.length ? dispatch({ type: "next", phase: "brief", line: state.line }) : setBriefComplete(true)} nextLabel="التالي" />)}
          {state.phase === "road" && <Road step={roadStep} setStep={setRoadStep} whistlePlayed={roadWhistlePlayed} onWhistle={markRoadWhistle} pay={(pay) => dispatch({ type: "paySayes", pay })} next={() => travel({ type: "next", phase: "road", line: state.line })} />}
          {state.phase === "meeting" && <Dialogue line={MEETING[state.line] ?? MEETING[0] ?? { who: "tarek", text: "" }} index={state.line} total={MEETING.length} onPrevious={state.line > 0 ? () => dispatch({ type: "previous", phase: "meeting", line: state.line }) : undefined} onNext={() => dispatch({ type: "next", phase: "meeting", line: state.line })} nextLabel="التالي" />}
          {state.phase === "office" && <Office state={state} dispatch={dispatch} onSend={sendRecommendation} sayesShown={sayesShown} markSayes={() => setSayesShown(true)} />}
          {state.phase === "verdict" && <Verdict state={state} dispatch={dispatch} travel={travel} endActions={endActions} onCallEnd={onCallEnd} onDone={onDone ? done : undefined} />}
        </motion.main>
      </AnimatePresence>
      <AnimatePresence>{fade && <motion.div className="g-dip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .35 }} />}</AnimatePresence>
      </div>
      {unavailable && <p className="g-save-warning" role="alert">الحفظ مش متاح في المتصفح ده. ماتقفلش اللعبة قبل ما تخلص.</p>}
      <GameOptions open={paused} title={otherTab ? "اللعبة مفتوحة في صفحة تانية" : exitPrompt ? "الخروج من اللعبة" : settingsOpen ? "إعدادات اللعبة" : "اللعبة متوقفة مؤقتاً"} onResume={() => { setSettingsOpen(false); resume(); }} onHome={exit} onRestart={restart} onPause={settingsOpen ? () => setSettingsOpen(false) : undefined} />
    </div>
  );
}

function Scene({ k }: { k: SceneKey }) {
  const s = SCENES[k];
  return <div className={`g-scene scene-${k}`} aria-hidden><motion.picture key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><source media="(max-width:640px)" srcSet={s.p} /><img src={s.l} alt="" /></motion.picture><div className={`g-wash ${k === "cover" ? "cover" : ""}`} /></div>;
}

const ANALYSIS_MS = 180_000;

function Hud({ state, muted, elapsed, timerVisible, onMute, onSettings, onThink }: { state: State; muted: boolean; elapsed: number; timerVisible: boolean; onMute: () => void; onSettings: () => void; onThink: () => void }) {
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  return <header className="g-hud"><div className="g-hud-tools"><SettingsButton onClick={onSettings} /><GameButton aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"} onClick={onMute}>{muted ? <VolumeX /> : <Volume2 />}</GameButton><GameButton className="g-test-nav-btn" aria-label="الرجوع لخيارات التفكير" title="الرجوع لخيارات التفكير" onClick={onThink}><RotateCcw /></GameButton></div><div className="g-hud-place"><small>{TITLE}</small><b>{STATION[state.phase]}</b></div>{timerVisible ? <div className={`g-timer is-counting${elapsed <= 30 ? " is-low" : ""}${elapsed <= 10 ? " is-critical" : ""}`} role="timer" aria-label={`الوقت المتبقي ${minutes} دقيقة و${seconds} ثانية`}><small>الوقت المتبقي</small><b>{minutes}:{seconds}</b><i aria-hidden><em /></i></div> : null}</header>;
}

function Cover({ go }: { go: () => void }) {
  return (
    <section className="g-cover">
      <motion.h1
        dir="ltr"
        initial={{ y: 24, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {TITLE}
      </motion.h1>
      <div className="g-cover-subtitles" dir="ltr">
        <motion.h2
          className="g-cover-ready"
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: [0, -3.5, 0], opacity: 1 }}
          transition={{
            opacity: { duration: 0.5, delay: 0.2 },
            y: { delay: 0.2, duration: 3.2, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          Are you ready!
        </motion.h2>
        <motion.p
          className="g-cover-analyst"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
        >
          You are The Analyst
        </motion.p>
      </div>
      <motion.button
        className="g-btn primary big g-cover-start-btn"
        onClick={go}
        dir="ltr"
        initial={{ y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.96 }}
        transition={{
          delay: 0.45,
          duration: 0.4,
          type: "spring",
          stiffness: 420,
          damping: 24,
        }}
      >
        Start now
      </motion.button>
    </section>
  );
}

type RoadStep = "drive" | "park" | "ask" | "reply" | "arrive";

function useSyncedTypewriter(text: string, voice?: string) {
  const chars = useMemo(() => Array.from(text), [text]);
  const [shown, setShown] = useSavedState(`text:${text}`, 0);
  const { paused, run } = useRuntime();
  const fallback = !voice || Boolean(run.ui["global:muted"]);
  const duration = Math.max(600, (voice ? VOICE_DURATIONS[voice] ?? 2 : Math.max(1.2, chars.length * .038)) * 1000);
  const left = useActiveTimer(`type:${text}`, duration, () => setShown(chars.length), fallback && shown < chars.length);
  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const sound = getCurrentVoice();
      if (voice && !fallback) {
        if (sound?.src.endsWith(voice) && sound.duration > 0) setShown(Math.min(chars.length, Math.ceil(sound.currentTime / sound.duration * chars.length)));
        else if (!sound) setShown(chars.length);
      } else setShown(Math.min(chars.length, Math.ceil((1 - left / duration) * chars.length)));
    };
    const id = window.setInterval(tick, 100); return () => clearInterval(id);
  }, [voice, text, paused, fallback, left, duration, chars.length, setShown]);
  const revealAll = useCallback(() => setShown(chars.length), [chars.length, setShown]);
  return { shown, done: shown >= chars.length, revealAll, chars };
}

const POSE_ANIM: Record<SayesPose, { initial: Record<string, number | string>; animate: Record<string, number | string | number[]> }> = {
  whistle: { initial: { scale: .4, opacity: 0 }, animate: { scale: [1.15, 1], opacity: 1, rotate: [0, -8, 8, -6, 6, 0] } },
  money: { initial: { x: -60, opacity: 0 }, animate: { x: 0, opacity: 1, rotate: [0, 4, 0] } },
  disgusted: { initial: { y: 20, opacity: 0 }, animate: { y: [20, -16, 0], opacity: 1 } },
  smart: { initial: { scale: .7, opacity: 0 }, animate: { scale: 1, opacity: 1 } },
  smug: { initial: { x: 0, opacity: 0 }, animate: { x: [0, 8, 0], opacity: 1, rotate: [0, -5, 0] } },
};

function ParkingLine({ played, onWhistle, onNext }: { played: boolean; onWhistle: () => void; onNext: () => void }) {
  const { paused } = useRuntime();
  const [voiceReady, setVoiceReady] = useState(played);
  const started = useRef(false);
  useEffect(() => {
    if (paused) return;
    if (played) { setVoiceReady(true); return; }
    if (!started.current) { started.current = true; sfx.whistle(); }
    const id = window.setTimeout(() => { onWhistle(); setVoiceReady(true); }, 550);
    return () => window.clearTimeout(id);
  }, [paused, played, onWhistle]);
  if (!voiceReady) return <div className="g-stage center" role="status" aria-label="صفارة السايس" />;
  return <NarrativeLine text={SAYES_PARK} voice="sayes-park.wav" name={SAYES_NAME} image={SAYES_ART.whistle} onNext={onNext} />;
}

function Road({ step, setStep, whistlePlayed, onWhistle, pay, next }: { step: RoadStep; setStep: (s: RoadStep) => void; whistlePlayed: boolean; onWhistle: () => void; pay: (p: "later" | "ten" | "fifty") => void; next: () => void }) {
  const { run } = useRuntime();
  const choice = SAYES_CHOICES.find(c => c.pay === run.state.sayes) ?? null;
  const [choicesReady, setChoicesReady] = useSavedState("parkingChoicesReady", false);
  const paymentLock = useRef(false);
  if (step === "drive") return <div className="g-stage center g-drive" aria-hidden />;
  if (step === "arrive" && choice) return <SceneGate label="الدخول لمكتب التدريب" onGo={next} />;
  if (step === "park") return <ParkingLine played={whistlePlayed} onWhistle={onWhistle} onNext={() => setStep("ask")} />;
  if (step === "ask" || !choice) return <div className="g-road-conversation">
    <NarrativeLine text={SAYES_ASK} voice="sayes-ask.wav" name={SAYES_NAME} image={SAYES_ART.money}
      autoAdvance={!choicesReady || Boolean(choice)} canNext={!choicesReady || Boolean(choice)} transitionSound={Boolean(choice)}
      onPrevious={() => { setChoicesReady(false); setStep("park"); }} onNext={() => choice ? setStep("reply") : setChoicesReady(true)} />
    {choicesReady && !choice && <div className="g-sayes-choices" aria-label="اختيار حساب الباركنج">{SAYES_CHOICES.map(c => <GameButton key={c.pay} className="secondary" onClick={() => {
      if (paymentLock.current) return; paymentLock.current = true; stopVoice(); sfx.tap(); pay(c.pay); setStep("reply");
    }}>{c.text}</GameButton>)}</div>}
  </div>;
  return <NarrativeLine text={choice.reply[0] ?? ""} voice={choice.voice} name={SAYES_NAME} image={SAYES_ART[choice.pose]}
    onPrevious={() => setStep("ask")} onNext={() => setStep("arrive")} />;
}

type PopStage = "intro" | "offer" | "paid";

function SayesPopup({ state, dispatch, onClose, onSend }: { state: State; dispatch: (a: Action) => void; onClose: () => void; onSend: () => void }) {
  const { run, paused } = useRuntime();
  const kind = state.sayes ?? "fifty";
  const [stage, setStage] = useSavedState<PopStage>("popStage", "intro");
  const [kindAtOpen, setKindAtOpen] = useSavedState("popKind", kind);
  const [whistlePlayed, setWhistlePlayed] = useSavedState("popupWhistlePlayed", false);
  const whistleStarted = useRef(false);
  useEffect(() => {
    if (paused || whistlePlayed || whistleStarted.current) return;
    whistleStarted.current = true;
    sfx.whistle();
    setWhistlePlayed(true);
  }, [paused, whistlePlayed, setWhistlePlayed]);
  useEffect(() => {
    if (!("popKind" in run.ui)) {
      setKindAtOpen(kind);
    }
  }, [kind, run.ui, setKindAtOpen]);
  const correct = isCorrect(state.claim, state.evidence);
  const wrongFifty = kindAtOpen === "fifty" && !correct;
  const data: { pose: SayesPose; text: string; auto?: boolean; paid?: string; voice?: string; paidVoice?: string; pay?: string; skip?: string } = wrongFifty ? SAYES_POPUP.fiftyWrong : SAYES_POPUP[kindAtOpen];
  const autoSendDuration = (data.voice && VOICE_DURATIONS[data.voice]) ? Math.round(VOICE_DURATIONS[data.voice] * 1000 + 600) : 2800;
  useActiveTimer("popIntro", 900, () => setStage("offer"), stage === "intro");
  useActiveTimer("popSend", autoSendDuration, onSend, stage === "offer" && "auto" in data);
  const pose: SayesPose = stage === "intro" ? "whistle" : "auto" in data ? "smart" : stage === "paid" ? "smart" : data.pose;
  const text = stage === "intro" ? "" : stage === "paid" ? (correct ? SAYES_POPUP.paidCorrect.text : (data.paid ?? data.text)) : data.text;
  const voice = stage === "offer" ? data.voice : stage === "paid" ? (correct ? SAYES_POPUP.paidCorrect.voice : data.paidVoice) : undefined;

  useEffect(() => {
    if (voice) {
      playVoice(voice);
    } else {
      stopVoice();
    }
    return () => {
      stopVoice();
    };
  }, [voice, stage]);

  const { shown, done, revealAll, chars } = useSyncedTypewriter(text, voice);
  const review = () => { stopVoice(); onClose(); dispatch({ type: "backFromEmail" }); };
  const proceed = () => { stopVoice(); onClose(); onSend(); };

  return <motion.div className="g-sayes-pop-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="g-sayes-pop" role="dialog" aria-label={SAYES_NAME} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}>
      <motion.div key={pose} className={`g-sayes-avatar pose-${pose}`} initial={POSE_ANIM[pose].initial} animate={POSE_ANIM[pose].animate} transition={{ duration: pose === "whistle" ? .5 : .6 }}><img src={SAYES_ART[pose]} alt="" /></motion.div>
      <div className="g-sayes-bubble-col">
        {text && <motion.div key={text} className={`g-sayes-bubble ${stage === "paid" || (kindAtOpen === "fifty" && stage === "offer") ? "glow" : ""}`} initial={{ scale: .6, opacity: 0, originX: 1, originY: 1 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 20 }} onClick={revealAll} style={{ cursor: done ? "default" : "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <b>{SAYES_NAME}</b>
            {voice && <button type="button" className="g-voice-indicator" title="إعادة الاستماع للصوت" onClick={(e) => { e.stopPropagation(); playVoice(voice); }}>🔊</button>}
          </div>
          <p>{chars.slice(0, shown).join("")}{!done && <i />}</p>
        </motion.div>}
        {stage === "offer" && !("auto" in data) && <motion.div className="g-sayes-choices" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .25 }}>
          {wrongFifty ? <>
            <button className="g-btn primary" onClick={review}>فهمتك يا أسطى.. رايح أراجع</button>
            <button className="g-btn secondary" onClick={proceed}>أرسل التوصية</button>
          </> : "pay" in data && <>
            <button className="g-btn primary" onClick={() => { stopVoice(); dispatch({ type: "sayesFifty" }); setStage("paid"); }}>{data.pay}</button>
            <button className="g-btn secondary" onClick={proceed}>{data.skip}</button></>}
        </motion.div>}
        {stage === "paid" && <motion.div className="g-sayes-choices" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .4 }}><button className="g-btn primary" onClick={review}>رايح أراجع</button><button className="g-btn secondary" onClick={proceed}>إرسال التوصية</button></motion.div>}
      </div>
    </motion.div>
  </motion.div>;
}

function Dialogue({ line, index, total, onNext, onPrevious, call = false, caller }: { line: Line; index: number; total: number; onNext: () => void; onPrevious?: () => void; nextLabel: string; call?: boolean; caller?: { name: string; role: string; img: string } }) {
  const who = caller ? { ...caller, tone: "dark" as const } : WHO[line.who];
  return <NarrativeLine text={line.text} voice={line.voice} name={who.name} role={who.role} image={caller?.img ?? PORTRAITS[line.who]} tone={who.tone}
    index={index} total={total} call={call} onNext={onNext} onPrevious={onPrevious} />;
}

function Office({ state, dispatch, onSend, sayesShown, markSayes }: { state: State; dispatch: (a: Action) => void; onSend: () => void; sayesShown: boolean; markSayes: () => void }) {
  const [report, setReport] = useSavedState<Metric | null>("report", null);
  const entryLock = useRef(false);
  if (!state.officeEntered) return <div className="g-stage center"><section className="g-arrive"><small>بعد مقابلة طارق</small><h2>مكتب التحليل مستنيك</h2><p>قدامك دقيقتين تختار طريق التحليل وتبعت التوصية.</p><button className="g-btn primary big" onClick={() => { if (entryLock.current) return; entryLock.current = true; sfx.tap(); dispatch({ type: "enterOffice" }); }}>ادخل المكتب</button></section></div>;
  return <div className="g-stage g-office-stage"><motion.section key={state.view} className={`g-office-view g-office-${state.view}`} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .24, ease: "easeOut" }}>
    {state.view === "think" && <Think dispatch={dispatch} />}
    {state.view === "guess" && <Guess dispatch={dispatch} />}
    {state.view === "preparingData" && <DataPreparation dispatch={dispatch} />}
    {state.view === "data" && <DataView state={state} dispatch={dispatch} openReport={setReport} />}
    {state.view === "ask" && <AskView state={state} dispatch={dispatch} />}
    {state.view === "email" && <Email state={state} dispatch={dispatch} onSend={onSend} sayesShown={sayesShown} markSayes={markSayes} />}
  </motion.section><AnimatePresence>{report && <OfficialReportModal metric={report} onClose={() => setReport(null)} />}</AnimatePresence></div>;
}

function Think({ dispatch }: { dispatch: (a: Action) => void }) {
  return <><header className="g-work-head"><small>لحظة التفكير</small><h2>هتبدأ منين؟</h2></header><div className="g-path-grid">{(["guess", "data", "ask"] as const).map((to, i) => <motion.button key={to} className={`g-path-card path-${to}`} onClick={() => { sfx.tap(); dispatch({ type: "think", to }); }} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * .07, duration: .24 }}><span>{i === 0 ? "⚡" : i === 1 ? "📊" : "❓"}</span><b>{THOUGHTS[to]}</b></motion.button>)}</div></>;
}

interface GuessFlowConfig {
  claimId: "trainer" | "trainees";
  metric: Metric;
  claimText: string;
  evidenceId: EvidenceId;
  chartTitle: string;
  adoptBtnText: string;
}

const GUESS_CONFIGS: Record<"trainer" | "trainees", GuessFlowConfig> = {
  trainer: {
    claimId: "trainer",
    metric: METRICS.complaints,
    claimText: "المشكلة في المحاضر وطريقة شرحه.",
    evidenceId: "complaints",
    chartTitle: "ملاحظة عدد الشكاوى (Complaints Count)",
    adoptBtnText: "اعتمد الملاحظة في التوصية",
  },
  trainees: {
    claimId: "trainees",
    metric: METRICS.attendance,
    claimText: "المشكلة في المتدربين ومش متوفر فيهم المهارات الأساسية.",
    evidenceId: "attendance",
    chartTitle: "دليل معدل الحضور (Attendance Rate)",
    adoptBtnText: "اعتمد الدليل في التوصية",
  },
};

function Guess({ dispatch }: { dispatch: (a: Action) => void }) {
  const [activeConfig, setActiveConfig] = useSavedState<GuessFlowConfig | null>("guessConfig", null);
  const [step, setStep] = useSavedState<"search" | "chart">("guessStep", "search");
  const [stamped, setStamped] = useSavedState("guessStamped", false);

  useActiveTimer("guessStamp", 700, () => { if (!activeConfig) return; dispatch({ type: "guess", id: activeConfig.claimId, evidence: activeConfig.evidenceId }); }, stamped);

  const handleSelect = (id: "trainer" | "trainees" | "data") => {
    if (id === "trainer" || id === "trainees") {
      sfx.tap();
      setActiveConfig(GUESS_CONFIGS[id]);
      setStep("search");
      setStamped(false);
    } else {
      sfx.pen();
      dispatch({ type: "guess", id });
    }
  };

  const handleAdopt = () => {
    if (!activeConfig || stamped) return;
    setStamped(true);
    sfx.stamp();

  };

  const handleSkipEvidence = () => {
    if (!activeConfig || stamped) return;
    sfx.pen();
    const { claimId } = activeConfig;
    setActiveConfig(null);
    dispatch({ type: "guess", id: claimId, evidence: null });
  };

  if (activeConfig && step === "search") {
    return (
      <div className="g-floating-stack" dir="rtl">
        <button
          className="g-floating-btn btn-red"
          onClick={() => {
            sfx.tap();
            setStep("chart");
          }}
        >
          ابحث عن دليل
        </button>
        <button
          className="g-floating-btn btn-white"
          onClick={handleSkipEvidence}
        >
          المتابعة للتوصية بدون دليل
        </button>
      </div>
    );
  }

  if (activeConfig && step === "chart") {
    return (
      <div className="g-floating-chart-view" dir="rtl">
        <InlineReportCard metric={activeConfig.metric} stamped={stamped} />
        <div className="g-floating-chart-actions">
          <button
            className="g-floating-btn btn-red"
            disabled={stamped}
            onClick={handleAdopt}
          >
            {stamped ? "تم الاعتماد ✓" : activeConfig.adoptBtnText}
          </button>
          <button
            className="g-floating-btn btn-white"
            disabled={stamped}
            onClick={handleSkipEvidence}
          >
            لا، إرسال التوصية بدونها
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="g-work-head">
        <h2>إيه تفسيرك الأول؟</h2>
      </header>
      <div className="g-choice-list">
        {GUESSES.map((g) => (
          <button key={g.id} onClick={() => handleSelect(g.id)}>
            {g.text}
          </button>
        ))}
      </div>
      <button className="g-btn secondary g-back-solid" onClick={() => dispatch({ type: "backToThink" })}>
        ارجع وفكر تاني
      </button>
    </>
  );
}

function DataPreparation({ dispatch }: { dispatch: (a: Action) => void }) {
  const remaining = Math.ceil(useActiveTimer("dataPreparation", DATA_PREPARATION_SECONDS * 1000, () => dispatch({ type: "dataReady" })) / 1000);
  return <Dialog.Root open><Dialog.Portal><Dialog.Overlay className="g-preparation-backdrop" /><Dialog.Content className="g-preparation" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} aria-describedby={undefined}>
    <Dialog.Title>جاري تجهيز وسحب بيانات التدريب...</Dialog.Title>
    <b className="g-loading-count" aria-live="polite">{remaining}</b>
    <div className="g-loading-track" role="progressbar" aria-label="تجهيز البيانات" aria-valuemin={0} aria-valuemax={5} aria-valuenow={5 - remaining}><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: DATA_PREPARATION_SECONDS, ease: "linear" }} /></div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function DataView({ state, dispatch, openReport }: { state: State; dispatch: (a: Action) => void; openReport: (m: Metric) => void }) {
  const [picking, setPicking] = useSavedState("dataPicking", Boolean(state.evidence));
  const restart = () => dispatch({ type: "backToThink" });

  const sourceNote = (
    <div className="g-dash-sources-note" dir="rtl">
      <div className="g-note-item">
        <span className="g-source-tag tag-lms">LMS</span>
        <span>دي الداتا اللي جاية من السيستم</span>
      </div>
      <div className="g-note-item">
        <span className="g-source-tag tag-survey">Survey</span>
        <span>دي الداتا اللي جاية من الاستبيان في آخر محاضرة</span>
      </div>
    </div>
  );

  if (!picking) return <><section className="g-dash-board" dir="ltr"><header><b>Training Dashboard</b><span><i className="bar-a" />المجموعة الأولى <i className="bar-b" />المجموعة الثانية</span></header>{sourceNote}<div className="g-dash-grid">{METRICS_LIST.map((m) => <DashChart key={m.id} metric={m} />)}</div></section>
    <div className="g-row-actions"><GameButton className="primary" onClick={() => { sfx.tap(); setPicking(true); }}>اختار الدليل والاستنتاج</GameButton><GameButton className="secondary" onClick={restart}>ارجع للبداية</GameButton></div></>;
  return <><header className="g-work-head compact"><small>الخطوة الجاية</small><h2>استكشف البيانات واختار الملاحظة اللي هتعتمد عليها</h2><p>اضغط على أي مؤشر.. وهتظهرلك الاستنتاجات تحت عشان تختار منها</p></header>
    {sourceNote}
    <div className="g-dash-grid g-pick-grid">{METRICS_LIST.map((m) => <DashChart key={m.id} metric={m} selected={state.evidence === m.id} onSelect={() => dispatch({ type: "evidence", id: m.id })} onZoom={() => openReport(m)} />)}</div>
    {state.evidence ? <ClaimPicker key={state.evidence} state={state} dispatch={dispatch} extra={<GameButton className="secondary" onClick={restart}>ارجع للبداية</GameButton>} /> : <div className="g-row-actions"><p className="g-pick-hint">👆 اختار ملاحظة من فوق عشان تكمّل</p><GameButton className="secondary" onClick={() => setPicking(false)}>رجوع للداشبورد</GameButton><GameButton className="secondary" onClick={restart}>ارجع للبداية</GameButton></div>}</>;
}

function AskView({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const asked = QUESTIONS.find((q) => q.id === state.asked[0]);
  if (!asked) return <><header className="g-work-head"><small>اسأل صح</small><h2>تسأل عن إيه؟</h2></header><div className="g-choice-list">{QUESTIONS.map((q) => <button key={q.id} onClick={() => { sfx.tap(); dispatch({ type: "ask", id: q.id }); }}>{q.text}</button>)}</div><GameButton className="secondary" onClick={() => dispatch({ type: "backToThink" })}>ارجع للبداية</GameButton></>;
  if (asked.na) return <section className="g-na-card"><span>غير متاح</span><h2>Data Not Available</h2><GameButton className="primary" onClick={() => dispatch({ type: "resetAsk" })}>الرجوع لقائمة الأسئلة</GameButton></section>;
  if (!asked.shows) return null;
  const metric = METRICS[asked.shows];
  return <><header className="g-work-head compact"><small>إجابة السؤال</small><h2>{asked.text}</h2></header><InlineReportCard metric={metric} /><ClaimPicker key={metric.id} state={state} dispatch={dispatch} extra={<GameButton className="secondary" onClick={() => dispatch({ type: "resetAsk" })}>الرجوع لقائمة الأسئلة</GameButton>} /></>;
}

function ClaimPicker({ state, dispatch, extra }: { state: State; dispatch: (a: Action) => void; extra?: import("react").ReactNode }) {
  const [confirming, setConfirming] = useSavedState("confirming", false);
  const claims = claimsFor(state);
  const zone = useRef<HTMLElement>(null);
  useEffect(() => { const id = window.setTimeout(() => zone.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); return () => window.clearTimeout(id); }, []);
  return <section ref={zone} className="g-claim-zone"><h3>اختار الاستنتاج اللي شايف إن الملاحظة دي بتدعمه</h3><div className="g-claims">{claims.map((id) => <button key={id} className={state.claim === id ? "is-selected" : ""} onClick={() => dispatch({ type: "claim", id })}><b>{CLAIM_LABELS[id]}</b></button>)}</div>
    <div className="g-row-actions"><GameButton className="primary" disabled={!state.claim || !state.evidence} onClick={() => setConfirming(true)}><Mail /> اكتب التوصية</GameButton>{extra}</div>
    <Dialog.Root open={confirming} onOpenChange={setConfirming}><Dialog.Portal><Dialog.Overlay className="g-preparation-backdrop" /><Dialog.Content className="g-pair-confirmation" aria-describedby={undefined}><Dialog.Title>{CONFIRM_PAIR}</Dialog.Title><div className="g-confirm-actions"><GameButton className="primary" onClick={() => { setConfirming(false); dispatch({ type: "confirm" }); }}>نعم، متأكد - اكتب التوصية</GameButton><GameButton className="secondary" onClick={() => setConfirming(false)}>تعديل الاختيار</GameButton></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>;
}

function Email({ state, dispatch, onSend, sayesShown, markSayes }: { state: State; dispatch: (a: Action) => void; onSend: () => void; sayesShown: boolean; markSayes: () => void }) {
  const [pop, setPop] = useSavedState("emailPop", false);
  const [flying, setFlying] = useSavedState("emailFlying", false);
  const [sent, setSent] = useSavedState("emailSent", false);
  useActiveTimer("emailSend", 800, () => { setSent(true); sfx.chime(); }, flying && !sent);
  useActiveTimer("emailConfirmation", 1800, onSend, sent);
  const fly = useCallback(() => { setPop(false); setFlying(true); whoosh(); }, [setPop, setFlying]);
  const claim = state.claim;
  if (!claim) return null;
  if (sent) return <section className="g-email-success" role="status"><CheckCircle2 /><h2>تم إرسال الإيميل بنجاح ✓</h2><p>التوصية وصلت لمكتب المدير العام.</p></section>;
  return <><motion.article className="g-mail" initial={{ y: 30, opacity: 0 }} animate={flying ? { y: "-90vh", x: "-25vw", scale: .2, rotate: -18, opacity: 0 } : { y: 0, opacity: 1 }} transition={flying ? { duration: .8, ease: "easeIn" } : { duration: .25 }}><div className="g-mail-bar"><Mail /> رسالة جديدة</div><div className="g-mail-head"><p><b>إلى:</b> مستر سيف — المدير العام</p><p><b>الموضوع:</b> توصية تقييم كورس التدريب والتجديد</p></div><p className="g-mail-hi">مستر سيف،</p><p className="g-mail-body">{emailBody(claim, state.evidence)}</p><p className="g-mail-sign">وتفضلوا بقبول فائق الاحترام،<br />محلل الموارد البشرية</p><div className="g-mail-actions"><button className="g-btn primary big" disabled={flying} onClick={() => { if (state.sayes && !sayesShown) { markSayes(); setPop(true); } else fly(); }}><Send /> {flying ? "التوصية في الطريق" : "إرسال التوصية"}</button><button className="g-btn secondary" disabled={flying} onClick={() => dispatch({ type: "backFromEmail" })}>راجع التحليل</button></div></motion.article><AnimatePresence>{pop && <SayesPopup state={state} dispatch={dispatch} onClose={() => setPop(false)} onSend={fly} />}</AnimatePresence></>;
}

function Verdict({ state, dispatch, travel, endActions, onDone, onCallEnd }: { state: State; dispatch: (a: Action) => void; travel: (a: Action) => void; endActions?: ReactNode; onDone?: () => void; onCallEnd?: () => void }) {
  const won = state.outcome === "win";
  const lines: Line[] = won
    ? WIN.lines
    : SAYES_LOSS_CALL[state.sayes === "fifty" ? "fifty" : "cheap"].map((call) => ({
        who: "seif",
        text: call.text,
        voice: call.voice,
      }));
  const caller = won ? undefined : { name: "السايس", role: "", img: SAYES_ART.portrait };
  const [i, setI] = useSavedState("verdictLine", 0);
  const [booth, setBooth] = useSavedState("verdictBooth", false);
  const [answered, setAnswered] = useSavedState("verdictAnswered", false);
  useActiveTimer("boothRedirect", 5000, () => onDone?.(), booth && Boolean(onDone));
  useEffect(() => { if (booth) { if (won) sfx.win(); else sfx.lose(); } }, [booth, won]);
  useEffect(() => { if (booth) onCallEnd?.(); }, [booth, onCallEnd]);
  if (!answered && !booth) return <IncomingCall name={won ? "مستر سيف" : "السايس"} role={won ? "المدير العام" : undefined} image={won ? PORTRAITS.seif : SAYES_ART.portrait} onAnswer={() => setAnswered(true)} />;
  if (!booth) return <Dialogue line={lines[i] ?? lines[0] ?? { who: "seif", text: "" }} index={i} total={lines.length} call caller={caller} onPrevious={i > 0 ? () => setI(i - 1) : undefined} nextLabel={i + 1 < lines.length ? "التالي" : "إنهاء المكالمة"} onNext={() => i + 1 < lines.length ? setI(i + 1) : setBooth(true)} />;
  return <div className="g-stage center"><motion.section className="g-booth" initial={{ opacity: 0, scale: .9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}>
    <span className="g-booth-icon" aria-hidden>{won ? "🏆" : "🔍"}</span>
    <h2>{BOOTH_MESSAGE}</h2>
    {endActions && <div className="g-booth-status">{endActions}</div>}
    {onDone ? <><button className="g-btn primary big" onClick={onDone}>متابعة <ChevronLeft /></button><i className="g-booth-bar" aria-hidden /></>
      : <div className="g-result-actions">{!won && <button className="g-btn primary big" onClick={() => dispatch({ type: "retry" })}>حاول تاني</button>}<button className="g-btn secondary big" onClick={() => travel({ type: "restart" })}><RotateCcw /> ابدأ من الأول</button></div>}
  </motion.section></div>;
}
