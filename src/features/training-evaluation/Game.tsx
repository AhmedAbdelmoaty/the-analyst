import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronLeft, DoorOpen, Home, Mail, Phone, RotateCcw, Send, Smartphone, Volume2, VolumeX } from "lucide-react";
import { CinematicScene } from "./CinematicScene";
import { PRELOAD_GROUPS, preloadAll, type CineKey } from "./cinematic";
import { DATA_PREPARATION_SECONDS, DEADLINE_SECONDS, claimsFor, initialState, reduce, timeLeft, type Action, type EvidenceId, type State } from "./engine";
import { SAYES_ASK, SAYES_CHOICES, SAYES_NAME, SAYES_PARK, SAYES_POPUP, type SayesPose, BRIEF, CLAIM_LABELS, CONFIRM_PAIR, emailBody, GUESSES, LOSS_GUESS, LOSS_SUPERFICIAL, MEETING, METRICS, METRICS_LIST, QUESTIONS, SEIF_MESSAGES, TAKEAWAYS, THOUGHTS, TIMEOUT, TITLE, WIN, type Ending, type Line, type Metric, type Speaker } from "./content";
import { PORTRAITS, SAYES_ART, SCENES, type SceneKey } from "./assets";
import { DashChart, InlineReportCard, OfficialReportModal } from "./Chart";
import { setMuted, sfx, startBgm, tick, whoosh } from "./audio";
import * as Dialog from "@radix-ui/react-dialog";
import { GameButton } from "./GameButton";
import "./game.css";

const WHO: Record<Speaker, { name: string; role: string; tone: "dark" | "light" }> = {
  tarek: { name: "أ. طارق", role: "مدير التدريب والتطوير", tone: "dark" },
  seif: { name: "مستر سيف", role: "المدير العام", tone: "light" },
  player: { name: "أنت", role: "محلل الـ HR", tone: "light" },
};

const STATION: Record<State["phase"], string> = { intro: "", brief: "مكتب المدير العام", road: "الطريق لمكتب التدريب", meeting: "مكتب التدريب", office: "مكتب التحليل", verdict: "القرار النهائي" };
const TEST_MODE = true;

const ending = (s: State): Ending => {
  if (s.timedOut) return TIMEOUT;
  if (s.outcome === "win") return WIN;
  if (s.outcome === "lossGuess") return LOSS_GUESS;
  return LOSS_SUPERFICIAL;
};

export default function Game({ onSubmit, endActions }: { onSubmit?: (s: State) => void; endActions?: ReactNode } = {}) {
  const [state, raw] = useReducer(reduce, undefined, initialState);
  const [muted, setMute] = useState(false);
  const [fade, setFade] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phoneOpen, setPhoneOpen] = useState(true);
  const timeoutSent = useRef(false);
  const [roadStep, setRoadStep] = useState<RoadStep>("drive");
  const [sayesShown, setSayesShown] = useState(false);
  useEffect(() => { if (state.phase === "intro" || state.phase === "brief") { setRoadStep("drive"); setSayesShown(false); } }, [state.phase]);
  const dispatch = useCallback((a: Action) => raw(a), []);

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
  const remaining = TEST_MODE ? DEADLINE_SECONDS : timeLeft(elapsed, state.penalty);
  useEffect(() => {
    if (!timerOn || TEST_MODE) return;
    const id = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerOn]);
  useEffect(() => {
    if (!timerOn || TEST_MODE) { timeoutSent.current = false; return; }
    if (remaining < 20 && remaining > 0) tick(remaining < 10);
    if (remaining === 0 && !timeoutSent.current) { timeoutSent.current = true; travel({ type: "timeout" }); }
  }, [remaining, timerOn, travel]);
  useEffect(() => {
    if (state.phase === "office" && !state.officeEntered) setElapsed(0);
  }, [state.phase, state.officeEntered]);

  const messageCount = remaining <= 20 ? 2 : remaining <= 45 ? 1 : 0;
  // Visual-only sub-beats (no gameplay effect): car entry → driving, parking in progress → completed.
  const [travelBeat, setTravelBeat] = useState(0);
  useEffect(() => { setTravelBeat(0); if ((state.phase === "road" && (roadStep === "drive" || roadStep === "park"))) { const id = window.setTimeout(() => setTravelBeat(1), 1600); return () => window.clearTimeout(id); } }, [state.phase, roadStep]);
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
      {state.phase === "intro" && <a href="/app" className="g-home-exit" aria-label="الرجوع للألعاب"><Home /></a>}
      {state.phase !== "intro" && <Hud state={state} muted={muted} remaining={remaining} timerOn={timerOn} onMute={() => setMute((v) => !v)} onRestart={() => { window.location.href = "/app"; }} onThink={() => dispatch({ type: "backToThink" })} />}
      {timerOn && messageCount > 0 && <PhoneNotifier count={messageCount} open={phoneOpen} onToggle={() => setPhoneOpen((v) => !v)} />}
      {timerOn && remaining < 15 && <div className="g-urgency-vignette" aria-hidden />}
      <AnimatePresence mode="wait">
        <motion.main key={`${state.phase}-${state.view}`} className="g-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}>
          {state.phase === "intro" && <Cover go={() => { startBgm(); sfx.tap(); travel({ type: "start" }); }} />}
          {state.phase === "brief" && <Dialogue line={BRIEF[state.line] ?? BRIEF[0] ?? { who: "seif", text: "" }} index={state.line} total={BRIEF.length} onNext={() => state.line + 1 < BRIEF.length ? dispatch({ type: "next" }) : travel({ type: "next" })} nextLabel={state.line + 1 < BRIEF.length ? "التالي" : "روح لمكتب التدريب"} />}
          {state.phase === "road" && <Road step={roadStep} setStep={setRoadStep} pay={(pay) => dispatch({ type: "paySayes", pay })} next={() => travel({ type: "next" })} />}
          {state.phase === "meeting" && <Dialogue line={MEETING[state.line] ?? MEETING[0] ?? { who: "tarek", text: "" }} index={state.line} total={MEETING.length} onNext={() => state.line + 1 < MEETING.length ? dispatch({ type: "next" }) : travel({ type: "next" })} nextLabel={state.line + 1 < MEETING.length ? "التالي" : "ادخل مكتبك"} />}
          {state.phase === "office" && <Office state={state} dispatch={dispatch} onSend={() => raw({ type: "send" })} sayesShown={sayesShown} markSayes={() => setSayesShown(true)} />}
          {state.phase === "verdict" && <Verdict state={state} dispatch={dispatch} travel={travel} endActions={endActions} />}
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

function Hud({ state, muted, remaining, timerOn, onMute, onRestart, onThink }: { state: State; muted: boolean; remaining: number; timerOn: boolean; onMute: () => void; onRestart: () => void; onThink: () => void }) {
  const urgency = remaining < 20 ? "red" : remaining < 45 ? "amber" : "calm";
  return <header className="g-hud"><div className="g-hud-tools"><button aria-label="الرجوع للألعاب" onClick={onRestart}><Home /></button><button aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"} onClick={onMute}>{muted ? <VolumeX /> : <Volume2 />}</button><button className="g-test-nav-btn" title="الرجوع لخيارات التفكير" onClick={onThink}>🔄 <span>رجوع للتفكير</span></button></div><div className="g-hud-place"><small>{TITLE}</small><b>{STATION[state.phase]}</b></div>{timerOn ? <div className={`g-timer ${urgency}`} role="timer"><b>{`${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`}</b><i><em style={{ width: `${(remaining / DEADLINE_SECONDS) * 100}%` }} /></i></div> : <span />}</header>;
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

function SayesLine({ pose, text, children }: { pose: SayesPose; text: string; children?: ReactNode }) {
  return <motion.section className="g-dialogue dark g-sayes-line" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}><span className="g-portrait g-sayes-pose"><AnimatePresence initial={false}><motion.img key={pose} src={SAYES_ART[pose]} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} /></AnimatePresence></span><div><header><span>{SAYES_NAME}</span></header><motion.p key={text} className="g-sayes-text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{text}</motion.p><footer className="g-sayes-actions">{children}</footer></div></motion.section>;
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
  if (step === "drive") return <div className="g-stage center g-drive"><motion.button className="g-road-cta" onClick={() => setStep("park")} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} whileTap={{ scale: .96 }}>اركن العربية <ArrowLeft /></motion.button></div>;
  if (step === "park") return <div className="g-stage"><SayesLine pose="whistle" text={SAYES_PARK}><button className="g-btn primary" onClick={() => setStep("ask")}>انزل من العربية <ChevronLeft /></button></SayesLine></div>;
  if (step === "ask" || !choice) return <div className="g-stage"><SayesLine pose="money" text={SAYES_ASK}><div className="g-sayes-choices">{SAYES_CHOICES.map((c, i) => <motion.button key={c.pay} className="g-btn secondary" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .15 + i * .08 }} whileTap={{ scale: .95 }} onClick={() => { pay(c.pay); setChoice(c); setLine(0); setStep("reply"); }}>{c.text}</motion.button>)}</div></SayesLine></div>;
  const last = line + 1 >= choice.reply.length;
  return <div className="g-stage"><SayesLine pose={choice.pose} text={choice.reply[line] ?? ""}>{last ? <button className="g-btn primary" onClick={() => { sfx.door(); next(); }}><DoorOpen /> الدخول لمكتب التدريب</button> : <button className="g-btn primary" onClick={() => setLine(line + 1)}>التالي <ChevronLeft /></button>}</SayesLine></div>;
}

type PopStage = "intro" | "offer" | "paid" | "skipped";

function SayesPopup({ state, dispatch, onClose, onSend }: { state: State; dispatch: (a: Action) => void; onClose: () => void; onSend: () => void }) {
  const kind = state.sayes ?? "fifty";
  const [stage, setStage] = useState<PopStage>("intro");
  const [kindAtOpen] = useState(kind);
  const data = SAYES_POPUP[kindAtOpen];
  useEffect(() => { const id = window.setTimeout(() => setStage("offer"), 900); return () => window.clearTimeout(id); }, []);
  useEffect(() => { if (stage !== "skipped") return; const id = window.setTimeout(onSend, 2600); return () => window.clearTimeout(id); }, [stage, onSend]);
  const pose: SayesPose = stage === "intro" ? "whistle" : stage === "paid" ? "smart" : stage === "skipped" ? "smug" : data.pose;
  const text = stage === "intro" ? "" : stage === "paid" && "paid" in data ? data.paid : stage === "skipped" && "skipped" in data ? data.skipped : data.text;
  const review = () => { onClose(); dispatch({ type: "backFromEmail" }); };
  return <motion.div className="g-sayes-pop-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="g-sayes-pop" role="dialog" aria-label={SAYES_NAME} initial={{ y: "110%" }} animate={stage === "skipped" ? { y: [0, 0, "120%"], opacity: [1, 1, 0] } : { y: 0 }} transition={stage === "skipped" ? { duration: 2.6, times: [0, .75, 1] } : { type: "spring", stiffness: 380, damping: 22 }}>
      <motion.div key={pose} className={`g-sayes-avatar pose-${pose}`} initial={POSE_ANIM[pose].initial} animate={POSE_ANIM[pose].animate} transition={{ duration: pose === "whistle" ? .5 : .6 }}><img src={SAYES_ART[pose]} alt="" /></motion.div>
      <div className="g-sayes-bubble-col">
        {text && <motion.div key={text} className={`g-sayes-bubble ${stage === "paid" || (kindAtOpen === "fifty" && stage === "offer") ? "glow" : ""}`} initial={{ scale: .6, opacity: 0, originX: 1, originY: 1 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 20 }}><b>{SAYES_NAME}</b><p>{text}</p></motion.div>}
        {stage === "offer" && <motion.div className="g-sayes-choices" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .25 }}>
          {"ok" in data ? <button className="g-btn primary" onClick={review}>{data.ok}</button> : <>
            <button className="g-btn primary" onClick={() => { dispatch({ type: "sayesFifty" }); setStage("paid"); }}>{data.pay}</button>
            <button className="g-btn secondary" onClick={() => setStage("skipped")}>{data.skip}</button></>}
        </motion.div>}
        {stage === "paid" && <motion.div className="g-sayes-choices" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .4 }}><button className="g-btn primary" onClick={review}>رايح أراجع</button><button className="g-btn secondary" onClick={() => { onClose(); onSend(); }}>إرسال التوصية</button></motion.div>}
      </div>
    </motion.div>
  </motion.div>;
}

function Dialogue({ line, index, total, onNext, nextLabel, call = false }: { line: Line; index: number; total: number; onNext: () => void; nextLabel: string; call?: boolean }) {
  const who = WHO[line.who];
  const chars = useMemo(() => Array.from(line.text), [line.text]);
  const [shown, setShown] = useState(0);
  const done = shown >= chars.length;
  useEffect(() => { setShown(0); }, [line.text]);
  useEffect(() => { if (done) return; const id = window.setTimeout(() => setShown((n) => Math.min(chars.length, n + 3)), 22); return () => window.clearTimeout(id); }, [shown, done, chars.length]);
  return <div className="g-stage"><motion.section className={`g-dialogue ${who.tone}`} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}><motion.span key={line.who} className={`g-portrait ${call ? "is-call" : ""}`} initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .25 }}><img src={PORTRAITS[line.who]} alt="" /></motion.span><div>{call && <span className="g-call-chip"><Phone />مكالمة من {who.name}<span className="g-call-waves"><i /><i /><i /></span></span>}<header><span>{who.name}</span><small>{who.role}</small><em>{index + 1}/{total}</em></header><button className="g-copy" onClick={() => done ? onNext() : setShown(chars.length)}><p>{chars.slice(0, shown).join("")}{!done && <i />}</p></button><footer>{done && <button className="g-btn primary" onClick={onNext}>{nextLabel}<ChevronLeft /></button>}</footer></div></motion.section></div>;
}

function PhoneNotifier({ count, open, onToggle }: { count: number; open: boolean; onToggle: () => void }) {
  if (!open) return <button className="g-phone-mini" onClick={onToggle} aria-label="فتح رسائل مستر سيف"><Smartphone /><b>{count}</b></button>;
  return <motion.div className="g-phone-device g-phone-buzz" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><i className="g-phone-btn g-phone-btn-power" /><i className="g-phone-btn g-phone-btn-vol" /><section className="g-phone-screen"><div className="g-phone-island"><span className="g-phone-camera" /><span className="g-phone-speaker" /></div><div className="g-phone-status-bar"><span>12:44</span><span className="g-phone-status-icons">5G 📶 🔋85%</span></div><button className="g-phone-head g-phone-header" onClick={onToggle}><img src={PORTRAITS.seif} alt="مستر سيف" /><span className="g-phone-meta"><b>مستر سيف (المدير العام)</b><small>متصل الآن 🟢</small></span><ChevronDown /></button><div className="g-phone-body">{SEIF_MESSAGES.slice(0, count).map((message) => <motion.article className="g-msg-bubble" key={message} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{message}<span className="g-msg-footer">الآن <i className="g-msg-ticks">✓✓</i></span></motion.article>)}</div><div className="g-phone-home-bar"><i className="g-home-pill" /></div></section></motion.div>;
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
  return <><header className="g-work-head compact"><h2>استكشف البيانات المتاحة</h2></header>
    {sourceNote}
    <div className="g-dash-grid g-pick-grid">{METRICS_LIST.map((m) => <DashChart key={m.id} metric={m} selected={state.evidence === m.id} onSelect={() => dispatch({ type: "evidence", id: m.id })} onZoom={() => openReport(m)} />)}</div>
    {state.evidence ? <ClaimPicker key={state.evidence} state={state} dispatch={dispatch} extra={<GameButton className="secondary" onClick={restart}>ارجع للبداية</GameButton>} /> : <div className="g-row-actions"><GameButton className="secondary" onClick={() => setPicking(false)}>رجوع للداشبورد</GameButton><GameButton className="secondary" onClick={restart}>ارجع للبداية</GameButton></div>}</>;
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
  return <section className="g-claim-zone"><h3>اختار الاستنتاج اللي شايف إن الملاحظة دي بتدعمه</h3><div className="g-claims">{claims.map((id) => <button key={id} className={state.claim === id ? "is-selected" : ""} onClick={() => dispatch({ type: "claim", id })}><b>{CLAIM_LABELS[id]}</b></button>)}</div>
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

function Verdict({ state, dispatch, travel, endActions }: { state: State; dispatch: (a: Action) => void; travel: (a: Action) => void; endActions?: ReactNode }) {
  const result = ending(state);
  const won = state.outcome === "win";
  const [stage, setStage] = useState<"talk" | "stamp" | "result">("talk");
  const finishDialogue = () => {
    setStage("stamp");
    sfx.stamp();
    window.setTimeout(() => {
      setStage("result");
      if (won) sfx.win();
      else sfx.lose();
    }, 1400);
  };
  if (stage === "talk") return <Dialogue line={result.lines[0] ?? { who: "seif", text: "" }} index={0} total={1} nextLabel="شوف النتيجة" onNext={finishDialogue} call />;
  if (stage === "stamp") return <motion.div className="g-stage center" animate={{ x: [0, -7, 7, -5, 5, 0], y: [0, 4, -4, 2, 0] }} transition={{ delay: .2, duration: .4 }}><motion.div className={`g-stamp ${won ? "good" : "bad"}`} initial={{ scale: 3.5, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: -10, opacity: 1 }} transition={{ type: "spring", damping: 10, stiffness: 220 }}>{result.stamp}</motion.div></motion.div>;
  const confetti = won ? Array.from({ length: 34 }, (_, n) => ({ n, x: (n * 37) % 100, d: 2.6 + (n % 5) * .45, delay: (n % 7) * .16, r: (n * 53) % 360, c: n % 3 })) : [];
  const takeaways = won ? TAKEAWAYS.win : TAKEAWAYS.loss;
  return <div className="g-stage center scroll">
    {confetti.map((p) => <motion.i key={p.n} className={`g-confetti c${p.c}`} style={{ left: `${p.x}%` }} initial={{ y: -40, rotate: p.r, opacity: 0 }} animate={{ y: "105vh", rotate: p.r + 540, opacity: [0, 1, 1, 0] }} transition={{ duration: p.d, delay: p.delay, ease: "easeIn" }} aria-hidden />)}
    <motion.section className={`g-results ${won ? "is-win" : "is-loss"}`} initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="g-res-main"><div className="g-status">{result.stamp}</div><div className="g-trophy-wrap">{won && <span className="g-rays" aria-hidden />}<div className="g-trophy">{won ? "🏆" : state.timedOut ? "⏳" : "📉"}</div></div><h2>«{result.title}»</h2><p className="g-rank-desc">{result.desc}</p></div>
      <div className="g-takeaways"><h3>الخلاصة التحليلية</h3>{takeaways.map((t, idx) => <motion.article key={t.q} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2 + idx * .15 }}><strong>{t.q}</strong><p>{t.a}</p></motion.article>)}</div>
      {endActions ? <div className="g-result-actions">{endActions}</div> : <div className="g-result-actions">{!won && <button className="g-btn primary big" onClick={() => dispatch({ type: "retry" })}>حاول تاني</button>}<button className="g-btn secondary big" onClick={() => travel({ type: "restart" })}><RotateCcw /> ابدأ من الأول</button></div>}
    </motion.section>
  </div>;
}
