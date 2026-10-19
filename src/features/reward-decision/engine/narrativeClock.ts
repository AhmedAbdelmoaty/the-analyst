import { useEffect, useRef } from 'react';
import type { Line } from '../data/script';
import type { RewardRun } from './model';

export const graphemes = (text: string): string[] => {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: new (locale: string, options: { granularity: 'grapheme' }) => { segment: (value: string) => Iterable<{ segment: string }> } }).Segmenter;
  return Segmenter ? Array.from(new Segmenter('ar', { granularity: 'grapheme' }).segment(text), item => item.segment) : Array.from(text);
};

export const lineDuration = (count: number) => {
  const revealMs = count * 34;
  const holdMs = Math.min(3400, Math.max(1600, 1350 + count * 16));
  return { revealMs, totalMs: Math.max(revealMs + holdMs, 2800, Math.ceil(count / 14 * 1000)) };
};

export function narrativeSpec(run: Pick<RewardRun, 'runId' | 'phase' | 'stage' | 'endingCall' | 'dialogueIndex'>, line: Line | null) {
  const key = [run.runId, run.phase, run.stage, run.endingCall, run.dialogueIndex, line?.id ?? ''].join(':');
  if (line) {
    const count = graphemes(line.text).length;
    const { revealMs, totalMs } = lineDuration(count);
    return { key, count, revealMs, totalMs };
  }
  const durations: Record<string, number> = {
    'celebration:intro': 1700,
    'celebration:draft': 2600,
    'debate:door': 1600,
    'briefing:done': 1300,
    'resolution:office': 1200,
    'resolution:gap': 900,
  };
  const totalMs = durations[`${run.phase}:${run.stage}`];
  return totalMs ? { key, count: 0, revealMs: 0, totalMs } : null;
}

/** A single wall-clock owner. Re-renders never restart it; disabling freezes remaining time. */
export function useNarrativeClock(
  spec: ReturnType<typeof narrativeSpec>, initialVisible: number, enabled: boolean,
  onVisible: (count: number, key: string) => void, onDone: (key: string) => boolean,
) {
  const clock = useRef<{ key: string; remaining: number; shown: number; done: boolean } | null>(null);
  if (spec && clock.current?.key !== spec.key) {
    const shown = Math.min(initialVisible, spec.count);
    clock.current = { key: spec.key, remaining: spec.totalMs - shown * 34, shown, done: false };
  }
  // Optional reveal assistance may jump ahead of the clock. Never make text disappear again.
  if (spec && clock.current && initialVisible > clock.current.shown) {
    clock.current.shown = Math.min(initialVisible, spec.count);
    clock.current.remaining = Math.min(clock.current.remaining, spec.totalMs - clock.current.shown * 34);
  }
  if (!spec) clock.current = null;

  useEffect(() => {
    const state = clock.current;
    if (!spec || !state || !enabled || state.done || state.key !== spec.key) return;
    let timer: number | undefined;
    let last = performance.now();
    let hidden = document.visibilityState === 'hidden';
    const spend = (notify: boolean) => {
      const now = performance.now();
      state.remaining = Math.max(0, state.remaining - (now - last));
      last = now;
      const shown = Math.min(spec.count, Math.floor((spec.totalMs - state.remaining) / 34));
      if (notify && shown > state.shown) { state.shown = shown; onVisible(shown, spec.key); }
      if (notify && state.remaining <= 0 && !state.done) state.done = onDone(spec.key);
    };
    const tick = () => {
      if (hidden || document.visibilityState === 'hidden') return;
      spend(true);
      if (!state.done) timer = window.setTimeout(tick, Math.min(34, Math.max(1, state.remaining)));
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && !hidden) {
        spend(false);
        hidden = true;
        if (timer !== undefined) window.clearTimeout(timer);
        timer = undefined;
      } else if (document.visibilityState === 'visible' && hidden) {
        hidden = false;
        last = performance.now();
        timer = window.setTimeout(tick, Math.min(34, Math.max(1, state.remaining)));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (!hidden) timer = window.setTimeout(tick, Math.min(34, Math.max(1, state.remaining)));
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer !== undefined) { window.clearTimeout(timer); if (!hidden) spend(false); }
    };
  }, [spec, enabled, onVisible, onDone]); // parent memoizes by semantic line, not visible character
}
