import { SPEAKERS, type Line, type Speaker } from './data/script';

export type Tone = 'light' | 'dark';
export const CHART_MIN = 60;
export const CHART_MAX = 150;
export const CHART_STEP = 10;

export function dialogueTone(lines: readonly Line[], speaker: Speaker): Tone {
  if (lines.some(line => line.speaker === 'player')) return speaker === 'player' ? 'light' : 'dark';
  return SPEAKERS[speaker].tone;
}

export function markerPosition(value: number): number {
  return Math.max(0, Math.min(100, ((value - CHART_MIN) / (CHART_MAX - CHART_MIN)) * 100));
}

export function distributionBins(values: readonly number[]) {
  return Array.from({ length: (CHART_MAX - CHART_MIN) / CHART_STEP }, (_, index) => {
    const start = CHART_MIN + index * CHART_STEP;
    const end = start + CHART_STEP;
    return { start, end, count: values.filter(value => value >= start && (value < end || (end === CHART_MAX && value === end))).length };
  });
}

// A smoothed trace of the observed bin counts, not a fitted probability distribution.
export function smoothDistributionPath(bins: ReturnType<typeof distributionBins>): string {
  const points = bins.map((bin, index) => ({ x: ((index + .5) / bins.length) * 100, y: 100 - bin.count * 9 }));
  if (!points.length) return '';
  return points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const mid = (previous.x + point.x) / 2;
    return `${path} C ${mid} ${previous.y}, ${mid} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}
