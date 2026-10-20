import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CASES, TUTORIAL } from "./data/cases";
import { BRIEFING, CHOICES, ENDING_LINE, MEETING_LINE, SKILLS, TUTORIAL_LINES } from "./data/dialogue";
import { EvidenceCard, EvidenceTray } from "./components/EvidenceFile";
import { ScatterGuess } from "./components/ScatterGuess";
import { ScatterPlot } from "./components/ScatterPlot";
import { StoryCard } from "./components/StoryCard";
import { patternFor, pearson } from "./engine/correlation";
import { ChaseTimer } from "./components/Mascot";
import { currentCase, ROUND_SECONDS, initialState, reducer, type Action, type GameState } from "./engine/gameState";
import { loadMeta, loadState, saveMeta, saveState, type Meta } from "./engine/persistence";
import { playTone } from "./engine/sound";
import { createRunSeed, generateRunCases } from "./engine/datasets";
import { GuideIllustration } from "./components/GuideIllustration";
import { RoundOutcome } from "./components/RoundOutcome";
import { OutcomeAnimation } from "./components/OutcomeAnimation";

function Brand() {
  return (
    <header dir="ltr" className="flex items-center justify-between border-b bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-primary px-2 py-1 font-latin text-sm font-black tracking-widest text-primary-foreground">IMP</span>
      </div>
      <div className="font-latin text-sm font-bold tracking-tight">
        The <span className="text-primary">Analyst</span>
      </div>
    </header>
  );
}

const Btn = ({ children, onClick, variant = "primary", className = "" }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost"; className?: string }) => (
  <button
    onClick={onClick}
    className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-bold transition active:scale-[0.99] ${
      variant === "primary" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border bg-card text-foreground hover:bg-muted"
    } ${className}`}
  >
    {children}
  </button>
);

export function BehindTheDotsGame({ userId }: { userId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [state, rawDispatch] = useReducer(reducer, initialState);
  const [meta, setMeta] = useState<Meta>({ tutorialDone: false, bestScore: 0, muted: false });
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  useEffect(() => {
    const s = loadState(window.localStorage, userId);
    rawDispatch({ type: "__hydrate", s });
    setMeta(loadMeta(window.localStorage, userId));
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (loaded) saveState(window.localStorage, userId, state);
  }, [state, loaded, userId]);

  useEffect(() => {
    const onVis = () => document.hidden && rawDispatch({ type: "pause" });
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const updateMeta = (m: Partial<Meta>) =>
    setMeta((prev) => {
      const next = { ...prev, ...m };
      saveMeta(window.localStorage, userId, next);
      return next;
    });

  const dispatch = (a: Action) => {
    const previous = stateRef.current;
    const guessIsRight = a.type === "submitTutorial"
      ? previous.guess === patternFor(pearson(TUTORIAL.xs, TUTORIAL.ys)!)
      : a.type === "submit"
        ? previous.guess === patternFor(pearson(currentCase(previous).xs, currentCase(previous).ys)!)
        : false;
    const selectedChoice = CHOICES.find((c) => c.id === previous.choice);
    const tone = a.type === "submit" && previous.phase === "puzzle" && previous.guess ? (guessIsRight ? "win" : "lose")
      : a.type === "submitTutorial" && previous.phase === "tutorial" && previous.guess ? (guessIsRight ? "win" : "lose")
      : a.type === "timeout" && previous.phase === "puzzle" && !previous.paused ? "lose"
      : a.type === "submitChoice" && previous.phase === "meeting" && selectedChoice ? (selectedChoice.supported ? "win" : "lose")
      : a.type === "attach" && previous.phase === "reveal" ? "save" : undefined;
    if (tone) playTone(tone, meta.muted);
    if (a.type === "finishTutorial" && !meta.tutorialDone) updateMeta({ tutorialDone: true });
    rawDispatch(a);
  };

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, [state.phase, state.caseIndex]);

  if (!loaded) return <div className="min-h-screen bg-background" />;

  const inGame = state.phase !== "cover";

  return (
    <div dir="rtl" lang="ar" className="behind-dots min-h-screen overflow-x-hidden bg-background text-foreground">
      <Brand />
      <div className={`mx-auto max-w-2xl px-4 pt-4 ${state.phase === "puzzle" ? "pb-48 pr-20" : "pb-16"}`}>
        <div className="mb-4 flex items-center justify-between gap-2">
          {inGame && state.phase !== "debrief" ? <EvidenceTray evidence={state.evidence} /> : <span />}
          <div className="flex items-center gap-1">
            {inGame && state.phase !== "debrief" && (
              <IconBtn label="إيقاف مؤقت" onClick={() => dispatch({ type: "pause" })}>
                <Pause className="h-4 w-4" />
              </IconBtn>
            )}
            <IconBtn label={meta.muted ? "تشغيل الصوت" : "كتم الصوت"} onClick={() => updateMeta({ muted: !meta.muted })}>
              {meta.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </IconBtn>
          </div>
        </div>

        <main key={`${state.phase}-${state.caseIndex}`} className="animate-rise">
          <Scene state={state} meta={meta} dispatch={dispatch} />
        </main>
        {state.phase === "puzzle" && <ChaseTimer key={state.caseIndex} seconds={ROUND_SECONDS} paused={state.paused} onTimeout={() => dispatch({ type: "timeout" })} />}
        {state.phase === "puzzle" && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-card backdrop-blur">
            <div className="mx-auto max-w-2xl">
              <button onClick={() => dispatch({ type: "submit" })} disabled={state.guess === null} className="h-14 w-full rounded-xl bg-primary text-lg font-black text-primary-foreground shadow-card disabled:opacity-50">
                {state.guess === null ? "اختار شكل النقط الأول ↑" : "ثبّت اختياري!"}
              </button>
            </div>
          </div>
        )}
      </div>

      {state.paused && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-pop rounded-2xl bg-card p-6 text-center shadow-card">
            <h2 className="mb-2 text-xl font-bold">وقفنا اللعبة شوية</h2>
            <p className="mb-5 text-base text-muted-foreground">خد نفسك. كل حاجة محفوظة.</p>
            <Btn onClick={() => dispatch({ type: "resume" })} className="w-full">
              <Play className="h-4 w-4" /> يلا نكمّل
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="grid h-11 w-11 place-items-center rounded-full border bg-card hover:bg-muted">
      {children}
    </button>
  );
}

function BackToGames({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/app")} className={`inline-flex items-center justify-center ${className}`}>{children}</button>;
}

function Scene({ state, meta, dispatch }: { state: GameState; meta: Meta; dispatch: (a: Action) => void }) {
  switch (state.phase) {
    case "cover":
      return <Cover onStart={() => dispatch({ type: "start", seed: createRunSeed(state.runSeed) })} />;
    case "briefing":
      return <Briefing state={state} meta={meta} dispatch={dispatch} />;
    case "tutorial":
    case "tutorialReveal":
      return <Tutorial state={state} meta={meta} dispatch={dispatch} />;
    case "puzzle":
    case "reveal":
      return <Puzzle state={state} dispatch={dispatch} />;
    case "meeting":
    case "challenge":
      return <Meeting state={state} dispatch={dispatch} />;
    case "debrief":
      return <Debrief state={state} dispatch={dispatch} />;
  }
}

function Cover({ onStart }: { onStart: () => void }) {
  return (
    <section className="story-cover py-5 text-center sm:py-8">
      <div className="mx-auto mb-5 max-w-lg rounded-3xl border bg-card p-2 shadow-card sm:p-3">
        <GuideIllustration scene="welcome" />
      </div>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-bold text-primary shadow-card">
        <span className="animate-pulse">✦</span> مغامرة عربية الآيس كريم <span className="animate-pulse">✦</span>
      </div>
      <p className="mb-2 font-latin text-xs font-semibold uppercase tracking-[0.3em] text-primary">Behind the Dots</p>
      <h1 className="mb-3 text-5xl font-black">ورا النقط</h1>
      <p className="mx-auto mb-6 max-w-md text-lg leading-relaxed text-muted-foreground">
        ليلى عندها عربية آيس كريم ودفتر مليان أيام ونقط. افهم معاها النقط بتقول إيه، وساعدها تجهّز لبكرة قبل ما جليتش يلحق دوتّي!
      </p>
      <div className="mx-auto mb-6 max-w-md rounded-2xl border bg-card p-4 text-right shadow-card">
        <strong className="text-xl">هدفنا: نكسب وننقذ دوتّي! 🏁</strong>
        <p className="mt-1 text-base leading-relaxed">اقرأ ٣ صفحات من دفتر ليلى، وبعدها ساعدها تختار خطة بكرة. كل ما تفهم النقط، دوتّي تقرب من النجاة!</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Btn onClick={onStart} className="w-full max-w-xs">يلا نعرف الحكاية <ChevronLeft className="h-5 w-5" /></Btn>
        <BackToGames className="h-11 gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 rotate-180" /> ارجع للألعاب</BackToGames>
      </div>
    </section>
  );
}

function Briefing({ state, meta, dispatch }: { state: GameState; meta: Meta; dispatch: (a: Action) => void }) {
  const done = state.briefingStep >= BRIEFING.length - 1;
  const scene = BRIEFING[state.briefingStep]!;
  return (
    <section className="space-y-4">
      <div className="story-intro-grid" key={state.briefingStep}>
        <div className="story-art-wrap">
          <GuideIllustration scene={scene.scene} />
        </div>
        <article className="story-narration">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary">{scene.kicker}</span>
            <span dir="ltr" className="font-latin text-sm font-bold text-muted-foreground">{state.briefingStep + 1} / {BRIEFING.length}</span>
          </div>
          <h1 className="mb-3 text-3xl font-black leading-tight">{scene.title}</h1>
          <p className="text-lg leading-[1.9]">{scene.text}</p>
          {(scene.scene === "axes" || scene.scene === "point") && (
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
              <span className="rounded-full bg-sky-100 px-3 py-2 text-sky-900">← تحت: حرارة اليوم</span>
              <span className="rounded-full bg-rose-100 px-3 py-2 text-rose-900">↑ على الجنب: كوبايات اتباعت</span>
            </div>
          )}
        </article>
      </div>
      {(scene.scene === "axes" || scene.scene === "point") && <TeachingPlot showPoint={scene.scene === "point"} />}
      <div className="story-progress" aria-label={`مشهد ${state.briefingStep + 1} من ${BRIEFING.length}`}>
        {BRIEFING.map((_, i) => <span key={i} className={i <= state.briefingStep ? "is-active" : ""} />)}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {state.briefingStep > 0 && <Btn variant="ghost" onClick={() => dispatch({ type: "backBriefing" })}><ChevronRight className="h-4 w-4" /> اللي فات</Btn>}
        <Btn onClick={() => dispatch({ type: done ? "openCase" : "advanceBriefing" })} className="flex-1">
          {done ? "جرّب بنفسك من غير وقت" : "كمّل الحكاية"} <ChevronLeft className="h-5 w-5" />
        </Btn>
        {meta.tutorialDone && done && (
          <Btn variant="ghost" onClick={() => dispatch({ type: "skipTutorial", tutorialEverDone: true })}>أنا فاهم اللعبة</Btn>
        )}
      </div>
    </section>
  );
}

function TeachingPlot({ showPoint }: { showPoint: boolean }) {
  return (
    <div className="teaching-plot rounded-2xl border bg-card p-4 shadow-card" dir="rtl">
      <h2 className="mb-2 text-xl font-black">{showPoint ? "تعالى نحط يوم الثلاثاء على الرسم" : "اقرأ الخطين الأول"}</h2>
      <svg viewBox="0 0 400 275" className="mx-auto block w-full max-w-xl" role="img" aria-label={showPoint ? "نقطة يوم الثلاثاء عند حرارة ٢٤ درجة و١٨ كوباية" : "المحور الأفقي للحرارة والمحور الرأسي للكوبايات"}>
        <path d="M52 24 V218 H370" fill="none" stroke="#526675" strokeWidth="3" />
        {[0, 10, 20, 30, 40].map((n) => <g key={n}><path d={`M${52 + n * 7.5} 218 v6`} stroke="#526675" strokeWidth="2" /><text x={52 + n * 7.5} y="241" textAnchor="middle">{n}</text></g>)}
        {[0, 10, 20, 30].map((n) => <g key={n}><path d={`M46 ${218 - n * 6} h6`} stroke="#526675" strokeWidth="2" /><text x="38" y={223 - n * 6} textAnchor="end">{n}</text></g>)}
        <text x="210" y="268" textAnchor="middle">🌡️ درجة الحرارة ←</text>
        <text x="18" y="100" transform="rotate(-90 18 100)" textAnchor="middle">🍦 كوبايات اتباعت</text>
        {showPoint && <g className="teaching-point"><path d="M232 218 V110 H52" fill="none" stroke="#e78272" strokeWidth="2.5" strokeDasharray="6 5" /><circle cx="232" cy="110" r="11" fill="#e78272" stroke="#fff" strokeWidth="3" /><text x="245" y="101">الثلاثاء</text></g>}
      </svg>
      <p className="text-center text-lg font-bold">{showPoint ? "نروح لـ٢٤ درجة تحت، ونطلع لـ١٨ كوباية. التقاطع ده هو نقطة الثلاثاء!" : "كل يوم له رقم تحت ورقم على الجنب. مكان تقابلهم هيبقى نقطته."}</p>
    </div>
  );
}

function MiniPattern({ kind }: { kind: "up" | "down" | "none" }) {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8];
  const ys = kind === "up" ? [2, 3, 3, 5, 5, 6, 8, 8] : kind === "down" ? [8, 7, 7, 5, 5, 4, 2, 2] : [5, 2, 7, 4, 8, 3, 6, 4];
  const label = kind === "up" ? "طالعة لفوق ↗" : kind === "down" ? "نازلة لتحت ↘" : "متبعثرة";
  return (
    <div className="rounded-xl border bg-card p-2 text-center">
      <ScatterPlot compact xs={xs} ys={ys} xLabel="" yLabel="" />
      <div className="mt-1 text-sm font-semibold">{label}</div>
    </div>
  );
}

function Tutorial({ state, meta, dispatch }: { state: GameState; meta: Meta; dispatch: (a: Action) => void }) {
  const [dot, setDot] = useState<number | null>(5);
  const revealed = state.phase === "tutorialReveal";
  const actual = patternFor(pearson(TUTORIAL.xs, TUTORIAL.ys)!);
  if (revealed && state.tutorialGuess !== null) {
    return <RoundOutcome c={TUTORIAL} result={{ guess: state.tutorialGuess, actual, points: 0 }} nextLabel="افتح دفتر ليلى" onNext={() => dispatch({ type: "finishTutorial" })} onRetry={() => dispatch({ type: "retryTutorial" })} />;
  }
  return (
    <section className="space-y-4">
      <div className="tutorial-coach">
        <div className="tutorial-coach-art"><GuideIllustration scene="axes" /></div>
        <div className="tutorial-coach-copy">
          <span>ليلى معاك · مفيش تايمر</span>
          <p>{TUTORIAL_LINES[0]}</p>
        </div>
      </div>
      <p className="text-center text-lg font-bold">دوس على نقطة عشان تشوف اليوم ده</p>
      <div className="rounded-2xl border bg-card p-3 shadow-card">
        <ScatterPlot xs={TUTORIAL.xs} ys={TUTORIAL.ys} xLabel={TUTORIAL.xLabel} yLabel={TUTORIAL.yLabel} highlight={dot} onDotClick={setDot} />
        {dot !== null && (
          <p className="mt-1 text-center text-sm">
            اليوم ده: {TUTORIAL.xLabel} = <b className="font-latin">{TUTORIAL.xs[dot]}</b> · {TUTORIAL.yLabel} = <b className="font-latin">{TUTORIAL.ys[dot]}</b>
          </p>
        )}
      </div>
      <StoryCard delay={150}>{TUTORIAL_LINES[1]}</StoryCard>
      <div className="grid grid-cols-3 gap-2">
        <MiniPattern kind="up" />
        <MiniPattern kind="down" />
        <MiniPattern kind="none" />
      </div>
      <h2 className="pt-2 text-center text-xl font-bold">دلوقتي اختار شكل النقط</h2>
      <ScatterGuess
        c={TUTORIAL}
        guess={state.guess}
        onGuess={(v) => dispatch({ type: "setGuess", value: v })}
        onSubmit={() => dispatch({ type: "submitTutorial" })}
        showPlot={false}
      />
      {!revealed && meta.tutorialDone && (
        <button onClick={() => dispatch({ type: "skipTutorial", tutorialEverDone: true })} className="mx-auto block h-11 text-sm text-muted-foreground underline">
          تخطّى التمرين
        </button>
      )}
    </section>
  );
}

function Puzzle({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const c = currentCase(state);
  const result = state.phase === "reveal" ? state.results[c.id] : undefined;
  if (result) return <RoundOutcome c={c} result={result} nextLabel={state.caseIndex === CASES.length - 1 ? "ساعد ليلى تختار خطة بكرة" : "اقلب الصفحة"} onNext={() => dispatch({ type: "attach" })} />;
  return (
    <section className="space-y-4">
      <div className="text-xs font-semibold text-primary">
        صفحة <span className="font-latin">{state.caseIndex + 1}</span> من <span className="font-latin">{CASES.length}</span> · {c.title}
      </div>
      <StoryCard>{c.question}</StoryCard>
      <ScatterGuess
        c={c}
        guess={state.guess}
        onGuess={(v) => dispatch({ type: "setGuess", value: v })}
        hintsUsed={state.hintsUsed}
        onHint={() => dispatch({ type: "hint" })}
        onSubmit={() => dispatch({ type: "submit" })}
        submitInDock={state.phase === "puzzle"}
      />
    </section>
  );
}

function Meeting({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const challenge = state.phase === "challenge" ? CHOICES.find((c) => c.id === state.choice) : null;
  if (challenge) return (
    <section className="space-y-4" aria-live="polite">
      <div className="rounded-2xl border bg-amber-50 p-4 shadow-card">
        <h1 className="text-3xl font-black">جليتش خطف الخطة! 😅</h1>
        <OutcomeAnimation kind="lose" />
        <div className="flex items-start gap-3 rounded-xl bg-card p-3">
          <p className="text-xl font-black leading-relaxed">ليلى: {challenge.quip}</p>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-sm font-bold text-muted-foreground">اختيارك</p>
        <p className="mt-1 text-lg font-bold">{challenge.text}</p>
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-lg leading-relaxed">💡 {challenge.challenge}</p>
      </div>
      <Btn onClick={() => dispatch({ type: "revise" })} className="w-full">يلا نرجع وننقذ الخطة</Btn>
    </section>
  );
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">ليلى بتجهّز لبكرة</h1>
      <StoryCard>{MEETING_LINE}</StoryCard>
      <div className="grid gap-3 sm:grid-cols-3">
        {state.evidence.map((id) => (
          <EvidenceCard key={id} id={id} result={state.results[id]} storyCase={state.runSeed === null ? undefined : generateRunCases(state.runSeed).find((c) => c.id === id)} />
        ))}
      </div>
        <div className="space-y-2">
          <h2 className="pt-2 text-xl font-bold">هتقول لليلى تعمل إيه؟</h2>
          {CHOICES.map((ch) => (
            <button
              key={ch.id}
              onClick={() => dispatch({ type: "choose", choice: ch.id })}
              aria-pressed={state.choice === ch.id}
              className={`flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-right text-[15px] leading-relaxed transition hover:bg-muted ${
                state.choice === ch.id ? "border-primary ring-2 ring-primary/30" : ""
              }`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-latin text-sm font-bold ${state.choice === ch.id ? "bg-primary text-primary-foreground" : ""}`}>
                {ch.id}
              </span>
              {ch.text}
            </button>
          ))}
          <Btn onClick={() => state.choice && dispatch({ type: "submitChoice" })} className={`w-full ${state.choice ? "" : "pointer-events-none opacity-40"}`}>
            ثبّت الاختيار
          </Btn>
        </div>
    </section>
  );
}

function Debrief({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  return (
    <section className="space-y-5">
      <div className="animate-pop rounded-2xl border bg-emerald-50 p-4 text-center shadow-card">
        <h1 className="text-3xl font-black">{ENDING_LINE}</h1>
        <OutcomeAnimation kind="win" />
        <p className="mt-3 text-lg font-bold">دوتّي بترقص، وليلى بتحتفل! دلوقتي العربية جاهزة للتجربة بكرة.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {state.evidence.map((id) => (
          <EvidenceCard key={id} id={id} result={state.results[id]} storyCase={state.runSeed === null ? undefined : generateRunCases(state.runSeed).find((c) => c.id === id)} />
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-4">
        <h2 className="mb-2 text-xl font-bold">إيه اللي اتعلمناه؟</h2>
        <ul className="list-disc space-y-1 pr-5 text-sm">
          {SKILLS.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          الرسم ورّانا أيام حصل فيها حاجتين مع بعض. عشان نعرف السبب بجد، ليلى لازم تجرّب وتراقب أيام تانية.
        </p>
      </div>
      <div className="rounded-2xl bg-foreground p-5 text-center text-background">
        <p className="text-xl font-black">كل نقطة يوم. والأيام بتحكي قصة!</p>
        <p className="mt-1 text-base opacity-80">بس لازم نجرب قبل ما نقول عرفنا السبب.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Btn onClick={() => dispatch({ type: "replay" })} className="flex-1">
          <RotateCcw className="h-4 w-4" /> العب مرة تانية
        </Btn>
        <BackToGames className="h-12 flex-1 rounded-xl border bg-card font-bold hover:bg-muted">ارجع للألعاب</BackToGames>
      </div>
    </section>
  );
}
