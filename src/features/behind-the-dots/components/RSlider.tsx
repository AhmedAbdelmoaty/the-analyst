import { Minus, Plus } from "lucide-react";
import { formatR } from "../engine/correlation";

interface Props {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export function RSlider({ value, onChange, disabled }: Props) {
  return (
    <div className="w-full">
      <div className="mb-1 text-center">
        <span className="text-base text-muted-foreground">توقّعك</span>
        <div dir="ltr" className="font-latin text-4xl font-bold tabular-nums text-foreground">
          r = {formatR(value)}
        </div>
      </div>
      <div dir="ltr" className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          aria-label="قلّل التوقع"
          onClick={() => onChange(value - 0.01)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-card text-foreground disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={value}
          disabled={disabled}
          aria-label="تقدير معامل الارتباط r من سالب واحد لموجب واحد"
          aria-valuetext={`r = ${formatR(value)}`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="btd-range"
        />
        <button
          type="button"
          disabled={disabled}
          aria-label="زوّد التوقع"
          onClick={() => onChange(value + 0.01)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-card text-foreground disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div dir="ltr" className="mt-2 grid grid-cols-3 gap-2">
        {[
          { v: -0.8, t: "عكسية قوية ↘" },
          { v: 0, t: "مفيش علاقة" },
          { v: 0.8, t: "طردية قوية ↗" },
        ].map((p) => (
          <button
            key={p.v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.v)}
            className="h-12 rounded-lg border bg-muted px-1 text-sm font-semibold leading-tight hover:bg-accent"
          >
            {p.t}
          </button>
        ))}
      </div>
      <div dir="ltr" className="mt-1 grid grid-cols-3 gap-1 px-12 text-sm text-muted-foreground">
        <span className="text-left"><span className="font-latin">−1.00</span> · علاقة عكسية</span>
        <span className="text-center">قريب من الصفر</span>
        <span className="text-right">علاقة طردية · <span className="font-latin">+1.00</span></span>
      </div>
    </div>
  );
}
