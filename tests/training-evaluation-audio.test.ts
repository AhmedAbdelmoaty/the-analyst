import { expect, test } from "bun:test";
import { pauseAudio, resumeAudio, startStreetAmbience, stopStreetAmbience } from "../src/features/training-evaluation/audio";

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  loop = false;
  volume = 1;
  muted = false;
  paused = true;
  currentTime = 0;
  playCalls = 0;
  preload = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src = "") {
    this.src = src;
    FakeAudio.instances.push(this);
  }
  play() { this.paused = false; this.playCalls++; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
}

test("street ambience loops, pauses and resumes without restarting after it is stopped", () => {
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  resumeAudio();
  startStreetAmbience();
  const street = FakeAudio.instances.find((audio) => audio.src.includes("street-traffic.mp3"));
  expect(street).toBeDefined();
  expect(street?.loop).toBe(true);
  expect(street?.paused).toBe(false);

  pauseAudio();
  expect(street?.paused).toBe(true);
  resumeAudio();
  expect(street?.paused).toBe(false);
  expect(street?.playCalls).toBe(2);

  stopStreetAmbience();
  expect(street?.paused).toBe(true);
  expect(street?.currentTime).toBe(0);
  resumeAudio();
  expect(street?.playCalls).toBe(2);
  pauseAudio();
});
