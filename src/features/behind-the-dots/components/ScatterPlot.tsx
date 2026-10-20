import { useMemo } from "react";
import { bestFit } from "../engine/correlation";

function niceTicks(min: number, max: number, count = 5) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= end + 1e-9; t += step) ticks.push(Number(t.toFixed(6)));
  return { ticks, lo: start, hi: end };
}

interface Props {
  xs: readonly number[];
  ys: readonly number[];
  xLabel: string;
  yLabel: string;
  showFit?: boolean | undefined;
  highlight?: number | null | undefined;
  onDotClick?: ((i: number) => void) | undefined;
  compact?: boolean;
}

export function ScatterPlot({ xs, ys, xLabel, yLabel, showFit, highlight, onDotClick, compact }: Props) {
  const W = 400;
  const H = compact ? 140 : 300;
  const m = compact ? { l: 14, r: 10, t: 10, b: 14 } : { l: 46, r: 16, t: 16, b: 48 };
  const { xT, yT, sx, sy } = useMemo(() => {
    const xT = niceTicks(Math.max(0, Math.min(...xs) - 0.5), Math.max(...xs) + 0.5);
    const yT = niceTicks(Math.max(0, Math.min(...ys) - 1), Math.max(...ys) + 1);
    const sx = (v: number) => m.l + ((v - xT.lo) / (xT.hi - xT.lo)) * (W - m.l - m.r);
    const sy = (v: number) => H - m.b - ((v - yT.lo) / (yT.hi - yT.lo)) * (H - m.t - m.b);
    return { xT, yT, sx, sy };
  }, [xs, ys, H, m.l, m.r, m.t, m.b]);
  const fit = showFit ? bestFit(xs, ys) : null;

  return (
    <svg
      style={{ direction: "ltr" }}
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label={`مخطط نقط: ${xLabel} مقابل ${yLabel}، ${xs.length} يوم`}
    >
      {!compact &&
        xT.ticks.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} className="stroke-chart-grid" />
            <text x={sx(t)} y={H - m.b + 16} textAnchor="middle" className="fill-muted-foreground font-latin text-[14px]">
              {t}
            </text>
          </g>
        ))}
      {!compact &&
        yT.ticks.map((t) => (
          <g key={`y${t}`}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} className="stroke-chart-grid" />
            <text x={m.l - 8} y={sy(t) + 4} textAnchor="end" className="fill-muted-foreground font-latin text-[14px]">
              {t}
            </text>
          </g>
        ))}
      <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="stroke-foreground/50" />
      <line x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} className="stroke-foreground/50" />
      {!compact && (
        <>
          <text x={(W + m.l) / 2} y={H - 8} textAnchor="middle" className="fill-foreground text-[14px] font-semibold">
            {xLabel} →
          </text>
          <text
            transform={`translate(13 ${(H - m.b + m.t) / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-foreground text-[14px] font-semibold"
          >
            {yLabel} →
          </text>
        </>
      )}
      {fit && (
        <line
          x1={sx(xT.lo)}
          y1={sy(fit.intercept + fit.slope * xT.lo)}
          x2={sx(xT.hi)}
          y2={sy(fit.intercept + fit.slope * xT.hi)}
          className="animate-draw stroke-primary"
          strokeWidth={2.5}
          strokeLinecap="round"
          clipPath="url(#btd-clip)"
        />
      )}
      <defs>
        <clipPath id="btd-clip">
          <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} />
        </clipPath>
      </defs>
      {xs.map((x, i) => {
        const hi = highlight === i;
        return (
          <g key={i}>
            {hi && !compact && (
              <>
                <line x1={sx(x)} x2={sx(x)} y1={sy(ys[i]!)} y2={H - m.b} className="stroke-primary" strokeDasharray="4 3" />
                <line x1={m.l} x2={sx(x)} y1={sy(ys[i]!)} y2={sy(ys[i]!)} className="stroke-primary" strokeDasharray="4 3" />
                <text x={sx(x) + 10} y={sy(ys[i]!) - 10} className="fill-primary font-latin text-[12px] font-bold">
                  ({x}, {ys[i]!})
                </text>
              </>
            )}
            <circle
              cx={sx(x)}
              cy={sy(ys[i]!)}
              r={compact ? 4 : hi ? 8 : 6.5}
              className={`animate-dot ${hi ? "fill-primary" : "fill-chart-dot"} ${onDotClick ? "cursor-pointer" : ""}`}
              style={{ animationDelay: `${i * 25}ms`, opacity: 0.88 }}
              onClick={onDotClick ? () => onDotClick(i) : undefined}
            />
            {onDotClick && (
              <circle cx={sx(x)} cy={sy(ys[i]!)} r={16} fill="transparent" className="cursor-pointer" onClick={() => onDotClick(i)} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
