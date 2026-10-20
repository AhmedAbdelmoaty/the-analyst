import type { Pattern } from "../data/cases";

export const PATTERN_LABELS: Record<Pattern, string> = {
  up: "النقط طالعة ↗",
  down: "النقط نازلة ↘",
  none: "مفيش اتجاه واضح ✨",
};

export function patternFor(r: number): Pattern {
  if (r >= 0.45) return "up";
  if (r <= -0.45) return "down";
  return "none";
}

/** Sample Pearson correlation. Returns null when undefined (n<2, length mismatch, zero variance). */
export function pearson(xs: readonly number[], ys: readonly number[]): number | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  const r = sxy / Math.sqrt(sxx * syy);
  return Number.isFinite(r) ? r : null;
}

/** Least-squares line y = a + b x, or null when undefined. */
export function bestFit(xs: readonly number[], ys: readonly number[]) {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

const EPS = 1e-9;

export type ScoreLabel = "excellent" | "close" | "good" | "review";

export function scoreGuess(guess: number, actual: number): { points: 0 | 1 | 2 | 3; label: ScoreLabel; error: number } {
  const error = Math.abs(guess - actual);
  if (error <= 0.15 + EPS) return { points: 3, label: "excellent", error };
  if (error <= 0.3 + EPS) return { points: 2, label: "close", error };
  if (error <= 0.5 + EPS) return { points: 1, label: "good", error };
  return { points: 0, label: "review", error };
}

export const SCORE_LABELS: Record<ScoreLabel, string> = {
  excellent: "ممتاز",
  close: "قريب",
  good: "محاولة كويسة",
  review: "راجع النمط",
};

export function formatR(r: number | null): string {
  if (r === null) return "غير معرّف";
  const v = Math.round(r * 100) / 100;
  if (Object.is(v, -0) || v === 0) return "0.00";
  return (v > 0 ? "+" : "−") + Math.abs(v).toFixed(2);
}

export function clampGuess(v: number): number {
  const stepped = Math.round(v * 100) / 100;
  return Math.max(-1, Math.min(1, Number(stepped.toFixed(2))));
}
