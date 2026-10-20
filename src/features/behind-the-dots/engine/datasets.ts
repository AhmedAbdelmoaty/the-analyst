import { CASES, type StoryCase } from "../data/cases";
import { pearson } from "./correlation";

const POINTS = 12;
const caseCache = new Map<number, readonly StoryCase[]>();
const Y_RANGES: Record<string, readonly [number, number]> = {
  C1: [8, 48],
  C2: [2, 20],
  C3: [8, 48],
};
const X_POOLS: Record<string, readonly number[]> = {
  // Each point is one day. Replays change the days while keeping the pattern clear.
  C1: Array.from({ length: 25 }, (_, i) => i + 15),
  C2: Array.from({ length: 24 }, (_, i) => i),
  C3: Array.from({ length: 24 }, (_, i) => i),
};

function randomFor(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRunSeed(previousSeed?: number | null): number {
  let seed = 0;
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  } else {
    seed = Math.floor(Math.random() * 0xffffffff);
  }
  if (previousSeed !== null && previousSeed !== undefined && seed === previousSeed) seed = (seed + 1) >>> 0;
  return seed >>> 0;
}

function makeXValues(c: StoryCase, rand: () => number): number[] {
  const pool = X_POOLS[c.id];
  if (!pool) return [...c.xs];
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, POINTS).sort((a, b) => a - b);
}

function makeYValues(c: StoryCase, xs: readonly number[], rand: () => number): number[] {
  const [min, max] = Y_RANGES[c.id] ?? [0, 30];
  if (c.id === "C3") {
    return Array.from({ length: POINTS }, () => min + Math.floor(rand() * (max - min + 1)));
  }
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const direction = c.id === "C1" ? 1 : -1;
  const spread = max - min;
  return xs.map((x) => {
    const signal = (x - xMin) / (xMax - xMin);
    const jitter = (rand() - 0.5) * 0.72;
    const value = direction > 0 ? signal + jitter : 1 - signal + jitter;
    return Math.round(min + Math.max(0, Math.min(1, value)) * spread);
  });
}

function inBand(id: string, r: number | null): boolean {
  if (r === null) return false;
  if (id === "C1") return r >= 0.70 && r <= 0.92;
  if (id === "C2") return r >= -0.92 && r <= -0.70;
  return Math.abs(r) <= 0.15;
}

function generateCase(c: StoryCase, seed: number): StoryCase {
  if (c.id === "T0") return c;
  const rand = randomFor(seed);
  for (let attempt = 0; attempt < 1000; attempt++) {
    const xs = makeXValues(c, rand);
    const ys = makeYValues(c, xs, rand);
    if (xs.length === POINTS && ys.length === POINTS && inBand(c.id, pearson(xs, ys))) return { ...c, xs, ys };
  }
  return c;
}

export function generateRunCases(seed: number): readonly StoryCase[] {
  const normalizedSeed = seed >>> 0;
  const cached = caseCache.get(normalizedSeed);
  if (cached) return cached;
  const generated = CASES.map((c, index) => generateCase(c, (normalizedSeed + Math.imul(index + 1, 0x9e3779b9)) >>> 0));
  caseCache.set(normalizedSeed, generated);
  if (caseCache.size > 8) caseCache.delete(caseCache.keys().next().value!);
  return generated;
}
