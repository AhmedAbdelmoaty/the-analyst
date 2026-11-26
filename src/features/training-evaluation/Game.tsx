import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, DoorOpen, Home, Mail, Phone, RotateCcw, Send, Volume2, VolumeX } from "lucide-react";
import { CinematicScene } from "./CinematicScene";
import { PRELOAD_GROUPS, preloadAll, type CineKey } from "./cinematic";
import { DATA_PREPARATION_SECONDS, claimsFor, initialState, isCorrect, reduce, type Action, type EvidenceId, type State } from "./engine";
import { SAYES_ASK, SAYES_CHOICES, SAYES_NAME, SAYES_PARK, SAYES_POPUP, type SayesPose, BRIEF, CLAIM_LABELS, CONFIRM_PAIR, emailBody, GUESSES, MEETING, METRICS, METRICS_LIST, QUESTIONS, SAYES_LOSS_CALL, BOOTH_MESSAGE, THOUGHTS, TITLE, WIN, VOICE_DURATIONS, type Line, type Metric, type Speaker } from "./content";
import { PORTRAITS, SAYES_ART, SCENES, type SceneKey } from "./assets";
import { DashChart, InlineReportCard, OfficialReportModal } from "./Chart";
import { getCurrentVoice, playVoice, setMuted, sfx, startBgm, stopVoice, whoosh } from "./audio";
import engageLogo from "./assets/engage-logo.jpeg";
import * as Dialog from "@radix-ui/react-dialog";
import { GameButton } from "./GameButton";
import "./game.css";

const WHO: Record<Speaker, { name: string; role: string; tone: "dark" | "light" }> = {
  tarek: { name: "أ. طارق", role: "مدير التدريب والتطوير", tone: "dark" },
  seif: { name: "مستر سيف", role: "المدير العام", tone: "light" },
  player: { name: "أنت", role: "محلل الـ HR", tone: "light" },
};

const STATION: Record<State["phase"], string> = { intro: "", brief: "مكتب المدير العام", road: "الطريق لمكتب التدريب", meeting: "مكتب التدريب", office: "مكتب التحليل", verdict: "القرار النهائي" };
export default function Game({ onSubmit, onStart, onDone, endActions }: { onSubmit?: (s: State) => void; onStart?: () => void; onDone?: () => void; endActions?: ReactNode } = {}) {
  const [state, raw] = useReducer(reduce, undefined, initialState);
  const [muted, setMute] = useState(false);
  const [fade, setFade] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [roadStep, setRoadStep] = useState<RoadStep>("drive");
  const [sayesShown, setSayesShown] = useState(false);
  useEffect(() => { if (state.phase === "intro" || state.phase === "brief") { setRoadStep("drive"); setSayesShown(false); } }, [state.phase]);
  const dispatch = useCallback((a: Action) => raw(a), []);
  const sendRecommendation = useCallback(() => raw({ type: "send" }), []);

  useEffect(() => { setMuted(muted); }, [muted]);
  useEffect(() => {
    const begin = () => startBgm();
    window.addEventListener("pointerdown", begin, { once: true });
    return () => window.removeEventListener("pointerdown", begin);
  }, []);

  const travel = useCallback((a: Action) => {
    setFade(true);
    whoosh();
    window.setTimeout(() => { raw(a); window.setTimeout(() => setFade(false), 120); }, 420);
  }, []);

  const submittedRef = useRef(false);
  useEffect(() => { if (state.phase === "verdict" && onSubmit && !submittedRef.current) { submittedRef.current = true; onSubmit(state); } }, [state, onSubmit]);
  const timerOn = state.phase === "office" && state.officeEntered;
  const timerVisible = state.officeEntered && (state.phase === "office" || state.phase === "verdict");
  useEffect(() => {
    if (!timerOn) return;
    const id = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerOn]);
  useEffect(() => {
    if (state.phase === "office" && !state.officeEntered) setElapsed(0);
  }, [state.phase, state.officeEntered]);

  // Visual-only sub-beats (no gameplay effect): car entry → driving, parking in progress → completed.
  const [travelBeat, setTravelBeat] = useState(0);
  useEffect(() => { setTravelBeat(0); if (state.phase !== "road") return; if (roadStep === "drive") { const a = window.setTimeout(() => setTravelBeat(1), 2600); const b = window.setTimeout(() => setRoadStep("park"), 7600); return () => { window.clearTimeout(a); window.clearTimeout(b); }; } if (roadStep === "park") { const id = window.setTimeout(() => setTravelBeat(1), 1600); return () => window.clearTimeout(id); } }, [state.phase, roadStep]);
  useEffect(() => { preloadAll(PRELOAD_GROUPS.start); }, []);
  useEffect(() => { if (state.phase === "brief" || state.phase === "road") preloadAll(PRELOAD_GROUPS.road); if (state.phase === "meeting") preloadAll(PRELOAD_GROUPS.meeting); if (state.phase === "office") { preloadAll(PRELOAD_GROUPS.office); preloadAll(PRELOAD_GROUPS.endings); } }, [state.phase]);
  const cine: CineKey | null = state.phase === "intro" ? null
    : state.phase === "brief" ? "briefing"
    : state.phase === "road" ? (roadStep === "drive" ? (travelBeat ? "driving" : "enterCar") : roadStep === "park" ? (travelBeat ? "parkingDone" : "parkingProgress") : roadStep === "ask" || !state.sayes ? "paymentRequest" : state.sayes === "later" ? "payLater" : state.sayes === "ten" ? "payTen" : "payFifty")
    : state.phase === "meeting" ? (state.line < 2 ? "tarekWelcome" : "tarekReport")
    : state.phase === "office" ? (!state.officeEntered ? "officeEntry" : state.view === "think" ? "thinking" : state.view === "guess" || state.view === "ask" ? "investigation" : state.view === "email" ? "sending" : "dashboard")
    : state.timedOut ? "timeout" : state.outcome === "win" ? "victory" : "failure";
  const scene: SceneKey = "cover";

  return (
    <div className="g600 g-training-eval" dir="rtl">
      {cine ? <CinematicScene k={cine} zoom={state.phase === "brief" && state.line > 0} /> : <Scene k={scene} />}
      {cine === "briefing" && <motion.figure className="g-engage-scene-logo" initial={{ opacity: 0, y: -12, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .45, ease: "easeOut" }}><img src={engageLogo} alt="Engage for Better Performance" /></motion.figure>}
      {state.phase === "intro" && <a href="/app" className="g-home-exit" aria-label="الرجوع للألعاب"><Home /></a>}
      {state.phase !== "intro" && <Hud state={state} muted={muted} elapsed={elapsed} timerVisible={timerVisible} onMute={() => setMute((v) => !v)} onRestart={() => { window.location.href = "/app"; }} onThink={() => dispatch({ type: "backToThink" })} />}
      <AnimatePresence mode="wait">
        <motion.main key={`${state.phase}-${state.view}`} className="g-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}>
          {state.phase === "intro" && <Cover go={() => { startBgm(); sfx.tap(); travel({ type: "start" }); onStart?.(); }} />}
          {state.phase === "brief" && <Dialogue line={BRIEF[state.line] ?? BRIEF[0] ?? { who: "seif", text: "" }} index={state.line} total={BRIEF.length} onNext={() => state.line + 1 < BRIEF.length ? dispatch({ type: "next" }) : travel({ type: "next" })} nextLabel={state.line + 1 < BRIEF.length ? "التالي" : "روح لمكتب التدريب"} />}
          {state.phase === "road" && <Road step={roadStep} setStep={setRoadStep} pay={(pay) => dispatch({ type: "paySayes", pay })} next={() => travel({ type: "next" })} />}
          {state.phase === "meeting" && <Dialogue line={MEETING[state.line] ?? MEETING[0] ?? { who: "tarek", text: "" }} index={state.line} total={MEETING.length} onNext={() => state.line + 1 < MEETING.length ? dispatch({ type: "next" }) : travel({ type: "next" })} nextLabel={state.line + 1 < MEETING.length ? "التالي" : "ادخل مكتبك"} />}
          {state.phase === "office" && <Office state={state} dispatch={dispatch} onSend={sendRecommendation} sayesShown={sayesShown} markSayes={() => setSayesShown(true)} />}
          {state.phase === "verdict" && <Verdict state={state} dispatch={dispatch} travel={travel} endActions={endActions} onDone={onDone} />}
        </motion.main>
      </AnimatePresence>
      <AnimatePresence>{fade && <motion.div className="g-dip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .35 }} />}</AnimatePresence>
    </div>
  );
}

function Scene({ k }: { k: SceneKey }) {
  const s = SCENES[k];
  return <div className={`g-scene scene-${k}`} aria-hidden><motion.picture key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><source media="(max-width:640px)" srcSet={s.p} /><img src={s.l} alt="" /></motion.picture><div className={`g-wash ${k === "cover" ? "cover" : ""}`} /></div>;
}

function Hud({ state, muted, elapsed, timerVisible, onMute, onRestart, onThink }: { state: State; muted: boolean; elapsed: number; timerVisible: boolean; onMute: () => void; onRestart: () => void; onThink: () => void }) {
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  return <header className="g-hud"><div className="g-hud-tools"><button aria-label="الرجوع للألعاب" onClick={onRestart}><Home /></button><button aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"} onClick={onMute}>{muted ? <VolumeX /> : <Volume2 />}</button><button className="g-test-nav-btn" title="الرجوع لخيارات التفكير" onClick={onThink}>🔄 <span>رجوع للتفكير</span></button></div><div className="g-hud-place"><small>{TITLE}</small><b>{STATION[state.phase]}</b></div>{timerVisible ? <div className="g-timer is-counting" role="timer" aria-label={`وقت التحليل ${minutes} دقيقة و${seconds} ثانية`}><small>وقت التحليل</small><b>{minutes}:{seconds}</b><i aria-hidden><em /></i></div> : <span />}</header>;
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

type RoadStep = "drive" | "park" | "ask" | "reply";

function useSyncedTypewriter(text: string, voice?: string) {
  const chars = useMemo(() => Array.from(text), [text]);
  const [shown, setShown] = useState(0);
  const done = shown >= chars.length;

  useEffect(() => {
    setShown(0);
  }, [text]);

  useEffect(() => {
    if (done) return;

    const expectedSec = voice && VOICE_DURATIONS[voice]
      ? VOICE_DURATIONS[voice]
      : Math.max(1.2, chars.length * 0.038);

    const pacingFactor = voice ? 0.93 : 0.95;
    const targetMs = Math.max(600, expectedSec * pacingFactor * 1000);
    const startTime = performance.now();

    let rafId: number;

    const tick = (now: number) => {
      let progress = 0;
      const activeVoice = getCurrentVoice();

      if (
        voice &&
        activeVoice &&
        activeVoice.src.includes(voice) &&
        !activeVoice.paused &&
        activeVoice.currentTime > 0
      ) {
        const totalDuration = activeVoice.duration && !isNaN(activeVoice.duration) && activeVoice.duration > 0
          ? activeVoice.duration
          : expectedSec;
        progress = Math.min(1, activeVoice.currentTime / (totalDuration * pacingFactor));
      } else {
        const elapsed = now - startTime;
        progress = Math.min(1, elapsed / targetMs);
      }

      const count = Math.min(chars.length, Math.floor(progress * chars.length));
      setShown((prev) => Math.max(prev, count));

      if (progress < 1 && count < chars.length) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [text, voice, done, chars.length]);

  const revealAll = useCallback(() => {
    setShown(chars.length);
  }, [chars.length]);

  return { shown, done, revealAll, chars };
}

function SayesLine({ pose, text, voice, children }: { pose: SayesPose; text: string; voice?: string; children?: ReactNode }) {
  const { shown, done, revealAll, chars } = useSyncedTypewriter(text, voice);

  useEffect(() => {
    if (voice) {
      playVoice(voice);
    } else {
      stopVoice();
    }
    return () => {
      stopVoice();
    };
  }, [voice, text]);

  return (
    <motion.section className="g-dialogue dark g-sayes-line" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <span className="g-portrait g-sayes-pose">
        <AnimatePresence initial={false}>
          <motion.img key={pose} src={SAYES_ART[pose]} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} />
        </AnimatePresence>
      </span>
      <div>
        <header>
          <span>{SAYES_NAME}</span>
          {voice && (
            <button
              type="button"
              className="g-voice-indicator"
              title="إعادة الاستماع للصوت"
              onClick={(e) => {
                e.stopPropagation();
                playVoice(voice);
              }}
            >
              🔊
            </button>
          )}
        </header>
        <button
          type="button"
          className="g-copy"
          onClick={revealAll}
          style={{ cursor: done ? "default" : "pointer" }}
        >
          <motion.p key={text} className="g-sayes-text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {chars.slice(0, shown).join("")}
            {!done && <i />}
          </motion.p>
        </button>
        <footer className="g-sayes-actions">{children}</footer>
      </div>
    </motion.section>
  );
}

const POSE_ANIM: Record<SayesPose, { initial: Record<string, number | string>; animate: Record<string, number | string | number[]> }> = {
  whistle: { initial: { scale: .4, opacity: 0 }, animate: { scale: [1.15, 1], opacity: 1, rotate: [0, -8, 8, -6, 6, 0] } },
  money: { initial: { x: -60, opacity: 0 }, animate: { x: 0, opacity: 1, rotate: [0, 4, 0] } },
  disgusted: { initial: { y: 20, opacity: 0 }, animate: { y: [20, -16, 0], opacity: 1 } },
  smart: { initial: { scale: .7, opacity: 0 }, animate: { scale: 1, opacity: 1 } },
  smug: { initial: { x: 0, opacity: 0 }, animate: { x: [0, 8, 0], opacity: 1, rotate: [0, -5, 0] } },
};

function Road({ step, setStep, pay, next }: { step: RoadStep; setStep: (s: RoadStep) => void; pay: (p: "later" | "ten" | "fifty") => void; next: () => void }) {
  const [choice, setChoice] = useState<(typeof SAYES_CHOICES)[number] | null>(null);
  const [line, setLine] = useState(0);
  if (step === "drive") return <div className="g-stage center g-drive" aria-hidden />;
  if (step === "park") return <div className="g-stage"><SayesLine pose="whistle" text={SAYES_PARK} voice="sayes-park.wav"><button className="g-btn primary" onClick={() => setStep("ask")}>انزل من العربية <ChevronLeft /></button></SayesLine></div>;
  if (step === "ask" || !choice) {
    return (
      <div className="g-stage">
        <SayesLine pose="money" text={SAYES_ASK} voice="sayes-ask.wav">
          <div className="g-sayes-choices">
            {SAYES_CHOICES.map((c, i) => (
              <motion.button
                key={c.pay}
                className="g-btn secondary"
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  sfx.tap();
                  pay(c.pay);
                  setChoice(c);
                  setLine(0);
                  setStep("reply");
                }}
              >
                {c.text}
              </motion.button>
            ))}
          </div>
        </SayesLine>
      </div>
    );
  }
  const last = line + 1 >= choice.reply.length;
  return <div className="g-stage"><SayesLine pose={choice.pose} text={choice.reply[line] ?? ""} voice={choice.voice}>{last ? <button className="g-btn primary" onClick={() => { sfx.door(); next(); }}><DoorOpen /> الدخول لمكتب التدريب</button> : <button className="g-btn primary" onClick={() => setLine(line + 1)}>التالي <ChevronLeft /></button>}</SayesLine></div>;
}

type PopStage = "intro" | "offer" | "paid";

function SayesPopup({ state, dispatch, onClose, onSend }: { state: State; dispatch: (a: Action) => void; onClose: () => void; onSend: () => void }) {
  const kind = state.sayes ?? "fifty";
  const [stage, setStage] = useState<PopStage>("intro");
  const [kindAtOpen] = useState(kind);
  const wrongFifty = kindAtOpen === "fifty" && !isCorrect(state.claim, state.evidence);
  const data = wrongFifty ? SAYES_POPUP.fiftyWrong : SAYES_POPUP[kindAtOpen];
  useEffect(() => { const id = window.setTimeout(() => setStage("offer"), 900); return () => window.clearTimeout(id); }, []);
  useEffect(() => { if (stage !== "offer" || !("auto" in data)) return; const id = window.setTimeout(onSend, 2800); return () => window.clearTimeout(id); }, [stage, data, onSend]);
  const pose: SayesPose = stage === "intro" ? "whistle" : "auto" in data ? "smart" : stage === "paid" ? "smart" : data.pose;
  const text = stage === "intro" ? "" : stage === "paid" && "paid" in data ? data.paid : data.text;
  const voice =
    stage === "offer" && "voice" in data
      ? data.voice
      : stage === "paid" && "paidVoice" in data
      ? data.paidVoice
      : undefined;

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

function Dialogue({ line, index, total, onNext, nextLabel, call = false, caller }: { line: Line; index: number; total: number; onNext: () => void; nextLabel: string; call?: boolean; caller?: { name: string; role: string; img: string } }) {
  const who = caller ? { ...caller, tone: "dark" as const } : WHO[line.who];
  const { shown, done, revealAll, chars } = useSyncedTypewriter(line.text, line.voice);

  useEffect(() => {
    if (line.voice) {
      playVoice(line.voice);
    } else {
      stopVoice();
    }
    return () => {
      stopVoice();
    };
  }, [line.voice, index]);

  return (
    <div className="g-stage">
      <motion.section className={`g-dialogue ${who.tone}`} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <motion.span
          key={caller?.name ?? line.who}
          className={`g-portrait ${call ? "is-call" : ""}`}
          initial={{ opacity: 0, scale: .9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: .25 }}
        >
          <img src={caller?.img ?? PORTRAITS[line.who]} alt="" />
        </motion.span>
        <div>
          {call && (
            <span className="g-call-chip">
              <Phone />مكالمة من {who.name}
              <span className="g-call-waves"><i /><i /><i /></span>
            </span>
          )}
          <header>
            <span>{who.name}</span>
            <small>{who.role}</small>
            {line.voice && (
              <button
                type="button"
                className="g-voice-indicator"
                title="إعادة الاستماع للصوت"
                onClick={(e) => {
                  e.stopPropagation();
                  playVoice(line.voice!);
                }}
              >
                🔊
              </button>
            )}
            <em>{index + 1}/{total}</em>
          </header>
          <button
            type="button"
            className="g-copy"
            onClick={() => (done ? onNext() : revealAll())}
            style={{ cursor: "pointer" }}
          >
            <p>
              {chars.slice(0, shown).join("")}
              {!done && <i />}
            </p>
          </button>
          <footer>
            <button
              className="g-btn primary"
              onClick={() => (done ? onNext() : revealAll())}
            >
              {nextLabel}<ChevronLeft />
            </button>
          </footer>
        </div>
      </motion.section>
    </div>
  );
}

function Office({ state, dispatch, onSend, sayesShown, markSayes }: { state: State; dispatch: (a: Action) => void; onSend: () => void; sayesShown: boolean; markSayes: () => void }) {
  const [report, setReport] = useState<Metric | null>(null);
  if (!state.officeEntered) return <div className="g-stage center"><section className="g-arrive"><small>بعد مقابلة طارق</small><h2>مكتب التحليل مستنيك</h2><p>قدامك دقيقتين تختار طريق التحليل وتبعت التوصية.</p><button className="g-btn primary big" onClick={() => { sfx.door(); dispatch({ type: "enterOffice" }); }}>ادخل المكتب</button></section></div>;
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
  const [activeConfig, setActiveConfig] = useState<GuessFlowConfig | null>(null);
  const [step, setStep] = useState<"search" | "chart">("search");
  const [stamped, setStamped] = useState(false);

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
    window.setTimeout(() => {
      const { claimId, evidenceId } = activeConfig;
      setActiveConfig(null);
      dispatch({ type: "guess", id: claimId, evidence: evidenceId });
    }, 700);
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
  const [remaining, setRemaining] = useState(DATA_PREPARATION_SECONDS);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, DATA_PREPARATION_SECONDS - Math.floor((Date.now() - started) / 1000));
      setRemaining(left);
      if (left === 0) { window.clearInterval(id); dispatch({ type: "dataReady" }); }
    }, 100);
    return () => window.clearInterval(id);
  }, [dispatch]);
  return <Dialog.Root open><Dialog.Portal><Dialog.Overlay className="g-preparation-backdrop" /><Dialog.Content className="g-preparation" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} aria-describedby={undefined}>
    <Dialog.Title>جاري تجهيز وسحب بيانات التدريب...</Dialog.Title>
    <b className="g-loading-count" aria-live="polite">{remaining}</b>
    <div className="g-loading-track" role="progressbar" aria-label="تجهيز البيانات" aria-valuemin={0} aria-valuemax={5} aria-valuenow={5 - remaining}><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: DATA_PREPARATION_SECONDS, ease: "linear" }} /></div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function DataView({ state, dispatch, openReport }: { state: State; dispatch: (a: Action) => void; openReport: (m: Metric) => void }) {
  const [picking, setPicking] = useState(Boolean(state.evidence));
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
  const [confirming, setConfirming] = useState(false);
  const claims = claimsFor(state);
  const zone = useRef<HTMLElement>(null);
  useEffect(() => { const id = window.setTimeout(() => zone.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); return () => window.clearTimeout(id); }, []);
  return <section ref={zone} className="g-claim-zone"><h3>اختار الاستنتاج اللي شايف إن الملاحظة دي بتدعمه</h3><div className="g-claims">{claims.map((id) => <button key={id} className={state.claim === id ? "is-selected" : ""} onClick={() => dispatch({ type: "claim", id })}><b>{CLAIM_LABELS[id]}</b></button>)}</div>
    <div className="g-row-actions"><GameButton className="primary" disabled={!state.claim || !state.evidence} onClick={() => setConfirming(true)}><Mail /> اكتب التوصية</GameButton>{extra}</div>
    <Dialog.Root open={confirming} onOpenChange={setConfirming}><Dialog.Portal><Dialog.Overlay className="g-preparation-backdrop" /><Dialog.Content className="g-pair-confirmation" aria-describedby={undefined}><Dialog.Title>{CONFIRM_PAIR}</Dialog.Title><div className="g-confirm-actions"><GameButton className="primary" onClick={() => { setConfirming(false); dispatch({ type: "confirm" }); }}>نعم، متأكد - اكتب التوصية</GameButton><GameButton className="secondary" onClick={() => setConfirming(false)}>تعديل الاختيار</GameButton></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>;
}

function Email({ state, dispatch, onSend, sayesShown, markSayes }: { state: State; dispatch: (a: Action) => void; onSend: () => void; sayesShown: boolean; markSayes: () => void }) {
  const [pop, setPop] = useState(false);
  const [flying, setFlying] = useState(false);
  const fly = useCallback(() => { setPop(false); setFlying(true); whoosh(); window.setTimeout(onSend, 800); }, [onSend]);
  const claim = state.claim;
  if (!claim) return null;
  return <><motion.article className="g-mail" initial={{ y: 30, opacity: 0 }} animate={flying ? { y: "-90vh", x: "-25vw", scale: .2, rotate: -18, opacity: 0 } : { y: 0, opacity: 1 }} transition={flying ? { duration: .8, ease: "easeIn" } : { duration: .25 }}><div className="g-mail-bar"><Mail /> رسالة جديدة</div><div className="g-mail-head"><p><b>إلى:</b> مستر سيف — المدير العام</p><p><b>الموضوع:</b> توصية تقييم كورس التدريب والتجديد</p></div><p className="g-mail-hi">مستر سيف،</p><p className="g-mail-body">{emailBody(claim, state.evidence)}</p><p className="g-mail-sign">وتفضلوا بقبول فائق الاحترام،<br />محلل الموارد البشرية</p><div className="g-mail-actions"><button className="g-btn primary big" disabled={flying} onClick={() => { if (state.sayes && !sayesShown) { markSayes(); setPop(true); } else fly(); }}><Send /> {flying ? "التوصية في الطريق" : "إرسال التوصية"}</button><button className="g-btn secondary" disabled={flying} onClick={() => dispatch({ type: "backFromEmail" })}>راجع التحليل</button></div></motion.article><AnimatePresence>{pop && <SayesPopup state={state} dispatch={dispatch} onClose={() => setPop(false)} onSend={fly} />}</AnimatePresence></>;
}

function Verdict({ state, dispatch, travel, endActions, onDone }: { state: State; dispatch: (a: Action) => void; travel: (a: Action) => void; endActions?: ReactNode; onDone?: () => void }) {
  const won = state.outcome === "win";
  const lines: Line[] = won
    ? WIN.lines
    : SAYES_LOSS_CALL[state.sayes === "fifty" ? "fifty" : "cheap"].map((call) => ({
        who: "seif",
        text: call.text,
        voice: call.voice,
      }));
  const caller = won ? undefined : { name: SAYES_NAME, role: "مكالمة من الشارع", img: SAYES_ART.smug };
  const [i, setI] = useState(0);
  const [booth, setBooth] = useState(false);
  useEffect(() => { if (!booth) return; if (won) sfx.win(); else sfx.lose(); if (!onDone) return; const id = window.setTimeout(onDone, 5000); return () => window.clearTimeout(id); }, [booth, won, onDone]);
  if (!booth) return <Dialogue line={lines[i] ?? lines[0]!} index={i} total={lines.length} call caller={caller} nextLabel={i + 1 < lines.length ? "التالي" : "إنهاء المكالمة"} onNext={() => i + 1 < lines.length ? setI(i + 1) : setBooth(true)} />;
  return <div className="g-stage center"><motion.section className="g-booth" initial={{ opacity: 0, scale: .9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}>
    <span className="g-booth-icon" aria-hidden>{won ? "🏆" : "🔍"}</span>
    <h2>{BOOTH_MESSAGE}</h2>
    {endActions && <div className="g-booth-status">{endActions}</div>}
    {onDone ? <><button className="g-btn primary big" onClick={onDone}>متابعة <ChevronLeft /></button><i className="g-booth-bar" aria-hidden /></>
      : <div className="g-result-actions">{!won && <button className="g-btn primary big" onClick={() => dispatch({ type: "retry" })}>حاول تاني</button>}<button className="g-btn secondary big" onClick={() => travel({ type: "restart" })}><RotateCcw /> ابدأ من الأول</button></div>}
  </motion.section></div>;
}
