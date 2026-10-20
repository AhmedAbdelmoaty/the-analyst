import { Lightbulb } from "lucide-react";
import type { Pattern, StoryCase } from "../data/cases";
import { HINTS } from "../data/dialogue";
import { ScatterPlot } from "./ScatterPlot";

const options: { value: Pattern; icon: string; label: string }[] = [
  { value: "up", icon: "↗", label: "طالعة" },
  { value: "down", icon: "↘", label: "نازلة" },
  { value: "none", icon: "✦", label: "متبعثرة" },
];

interface Props {
  c: StoryCase;
  guess: Pattern | null;
  onGuess: (v: Pattern) => void;
  hintsUsed?: number;
  onHint?: () => void;
  onSubmit: () => void;
  submitInDock?: boolean;
  showPlot?: boolean;
}

export function ScatterGuess({ c, guess, onGuess, hintsUsed = 0, onHint, onSubmit, submitInDock = false, showPlot = true }: Props) {
  return (
    <div className="rounded-2xl border bg-card p-3 shadow-card sm:p-5">
      {showPlot && <><p className="mb-2 text-center text-base font-bold">كل نقطة = يوم واحد</p>
      <ScatterPlot xs={c.xs} ys={c.ys} xLabel={c.xLabel} yLabel={c.yLabel} /></>}
        <div className="mt-4 space-y-3">
          <h2 className="text-center text-xl font-black">من الشمال لليمين، النقط ماشية إزاي؟</h2>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="اختار شكل النقط">
            {options.map((option) => (
              <button key={option.value} type="button" onClick={() => onGuess(option.value)} aria-pressed={guess === option.value}
                className={`pattern-choice ${guess === option.value ? "is-selected" : ""}`}>
                <span aria-hidden="true">{option.icon}</span><strong>{option.label}</strong>
              </button>
            ))}
          </div>
          {hintsUsed > 0 && HINTS.slice(0, hintsUsed).map((h) => <p key={h} className="animate-rise rounded-xl bg-muted px-3 py-2 text-base">💡 {h}</p>)}
          <div className="flex gap-2">
            {!submitInDock && <button type="button" onClick={onSubmit} disabled={!guess} className="h-12 flex-1 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-40">اختار وثبّت</button>}
            {onHint && hintsUsed < 2 && <button type="button" onClick={onHint} className="flex h-12 items-center gap-1 rounded-xl border px-4 text-sm font-semibold"><Lightbulb className="h-4 w-4" /> تلميح</button>}
          </div>
        </div>
    </div>
  );
}
