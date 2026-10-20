import { useState } from "react";
import type { StoryCase } from "../data/cases";
import { PATTERN_LABELS } from "../engine/correlation";
import type { CaseResult } from "../engine/gameState";
import { ScatterPlot } from "./ScatterPlot";
import { OutcomeAnimation } from "./OutcomeAnimation";

export function RoundOutcome({ c, result, nextLabel, onNext, onRetry }: {
  c: StoryCase;
  result: CaseResult;
  nextLabel: string;
  onNext: () => void;
  onRetry?: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const saved = !result.timedOut && result.guess === result.actual;
  const whyVisible = !saved || showWhy;

  return (
    <section className="space-y-4" aria-live="polite">
      <div className={`rounded-2xl border p-4 shadow-card ${saved ? "bg-emerald-50" : "bg-amber-50"}`}>
        <div className="mb-2 text-sm font-bold text-muted-foreground">{c.title}</div>
        <h1 className="text-3xl font-black leading-tight">
          {saved ? "صح! دوتّي نجت 🎉" : result.timedOut ? "الوقت خلص… جليتش لحق دوتّي! 😅" : "أوبس! جليتش لحق دوتّي! 😅"}
        </h1>
        <OutcomeAnimation kind={saved ? "win" : "lose"} />
        <p className="text-lg font-bold leading-relaxed">
          {saved ? "دوتّي بتجري من الفرحة، وليلى بتحتفل معاك!" : "جليتش عمل لقمة كوميدية… بس دوتّي هترجع في الصفحة الجاية!"}
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <div className="rounded-xl bg-muted p-3 text-lg">
          <span className="block text-sm font-bold text-muted-foreground">{saved ? "اختيارك كان" : "اختيارك"}</span>
          <strong>{result.guess ? PATTERN_LABELS[result.guess] : "ما لحقتش تختار"}</strong>
        </div>
        {whyVisible && (
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-lg">
            <span className="block text-sm font-bold text-emerald-800">الإجابة الصح</span>
            <strong>{PATTERN_LABELS[result.actual]}</strong>
          </div>
        )}
        {whyVisible ? (
          <div className="mt-3 space-y-2 text-lg leading-relaxed">
            <p>{c.insight}</p>
            {!saved && <p className="text-base font-semibold text-primary">💡 {c.patternTip}</p>}
          </div>
        ) : (
          <button type="button" onClick={() => setShowWhy(true)} className="mt-3 h-11 rounded-xl border px-4 font-bold hover:bg-muted">
            شوف ليه
          </button>
        )}
      </div>

      {whyVisible && (
        <details className="rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer text-base font-bold">بص على الرسم تاني</summary>
          <ScatterPlot xs={c.xs} ys={c.ys} xLabel={c.xLabel} yLabel={c.yLabel} showFit={result.actual !== "none"} />
        </details>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={onNext} className="h-12 flex-1 rounded-xl bg-primary px-5 text-base font-black text-primary-foreground">{nextLabel}</button>
        {onRetry && <button onClick={onRetry} className="h-12 rounded-xl border bg-card px-5 font-bold">جرّب التدريب تاني</button>}
      </div>
    </section>
  );
}
